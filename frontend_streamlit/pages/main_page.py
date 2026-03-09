# streamlit frontend

import requests
import streamlit as st

# Configuration 
# Lokaler API-Endpoint für die URL-basierte Inferenz
API_URL = "http://127.0.0.1:8000/predict-url"
HEALTH_URL = "http://127.0.0.1:8000/health"

# Page Layout 
st.title("ML Phishing URL Detector")
st.write("Enter a URL to check if it is legitimate or phishing.")

#  Sidebar 
with st.sidebar:
    st.header("Settings & Tools")
    if st.button("Check Backend Health"):
        try:
            h_resp = requests.get(HEALTH_URL, timeout=5)
            if h_resp.status_code == 200:
                st.success("Backend is online")
            else:
                st.error(f"Backend error: {h_resp.status_code}")
        except Exception:
            st.error("Backend unreachable")
    
    st.divider()
    st.caption(f"Target: {API_URL}")

# URL Input Section 
col_url, col_model = st.columns([3, 1])

with col_url:
    url_input = st.text_input("Enter URL:", placeholder="https://example.com").strip()

with col_model:
    model_choice = st.selectbox(
        "Model",
        options=["url_only", "rf_full"],
        format_func=lambda x: "Fast (URL Only)" if x == "url_only" else "Full (30 Features)"
    )

extended_checks = False
if model_choice == "rf_full":
    extended_checks = st.toggle("Extended checks (Experimental)", value=False, help="Perform DNS and HTTP lookups (currently mostly imputed).")

if st.button("Check and analyze your URL", type="primary"):
    if not url_input:
        st.warning("Please enter a URL first.")
    else:
        try:
            with st.spinner("Analyzing URL..."):
                headers = {"Content-Type": "application/json"}
                payload = {
                    "url": url_input,
                    "model": model_choice,
                    "extended": extended_checks
                }
                
                response = requests.post(
                    API_URL, 
                    json=payload, 
                    headers=headers, 
                    timeout=15
                )

            if response.status_code == 200:
                data = response.json()
                
                prediction = data.get("prediction", "Unknown")
                phish_prob = data.get("phishing_probability", 0.0)
                legit_prob = data.get("legit_probability", 0.0)
                threshold = data.get("threshold", 0.5)
                model_used = data.get("model_used", "unknown")
                
                # display results
                if prediction == "Malicious":
                    st.error(f"### 🚨 Prediction: {prediction}")
                else:
                    st.success(f"### ✅ Prediction: {prediction}")
                
                # Fetch Info (Extended Checks)
                fetch_info = data.get("fetch_info")
                if fetch_info:
                    with st.container(border=True):
                        st.caption("🌐 **Extended Fetch Info**")
                        cols = st.columns(3)
                        cols[0].write(f"**Status:** {fetch_info.get('status_code', 'N/A')}")
                        cols[1].write(f"**Redirects:** {fetch_info.get('redirect_count', 0)}")
                        cols[2].write(f"**Allowed:** {'✅' if fetch_info.get('allowed') else '❌'}")
                        if fetch_info.get("final_url"):
                            st.write(f"**Final URL:** `{fetch_info['final_url']}`")
                        if fetch_info.get("error"):
                            st.warning(f"Fetch Error: {fetch_info['error']}")

                st.caption(f"Model used: `{model_used}` | Threshold: `{threshold:.2f}`")

                # display metrics
                col1, col2 = st.columns(2)
                col1.metric("Phishing Prob.", f"{phish_prob:.3f}")
                col2.metric("Legit Prob.", f"{legit_prob:.3f}")
               
                # Feature Breakdown
                with st.expander("URL Feature Breakdown", expanded=True):
                    features = data.get("features", {})
                    
                    if features:
                        # Full mapping for all potential features
                        feature_names = {
                            "having_ip_address": "Contains IP Address",
                            "url_length": "URL Length",
                            "shortining_service": "Uses Shortener Service",
                            "having_at_symbol": "Contains '@' Symbol",
                            "double_slash_redirecting": "Redirection via '//'",
                            "prefix_suffix": "Prefix/Suffix in Host",
                            "having_sub_domain": "Multiple Subdomains",
                            "https_token": "'https' Token in Host",
                            "sslfinal_state": "SSL State",
                            "domain_registeration_length": "Domain Reg. Length",
                            "favicon": "Favicon Presence",
                            "port": "Non-standard Port",
                            "request_url": "External Request URL",
                            "url_of_anchor": "Anchor URL Ratio",
                            "links_in_tags": "Links in Tags Ratio",
                            "sfh": "Server Form Handler",
                            "submitting_to_email": "Submits to Email",
                            "abnormal_url": "Abnormal structures",
                            "redirect": "Redirect Count",
                            "on_mouseover": "Mouseover effects",
                            "rightclick": "Right-click disabled",
                            "popupwidnow": "Popup windows",
                            "iframe": "Iframe usage",
                            "age_of_domain": "Domain Age",
                            "dnsrecord": "DNS Record Found",
                            "web_traffic": "Web Traffic Rank",
                            "page_rank": "Page Rank",
                            "google_index": "Google Index Status",
                            "links_pointing_to_page": "Inbound Links",
                            "statistical_report": "Known Malicious List"
                        }
                        
                        display_data = []
                        # Only show features that are in the response
                        for key, val in features.items():
                            name = feature_names.get(key, key)
                            
                            if key == "url_length":
                                status = f"{val} (numeric)"
                            elif val == 1:
                                status = "✅ Legitimate / Low"
                            elif val == -1:
                                status = "🚩 Phishing / High"
                            elif val == 0:
                                status = "⚠️ Suspicious / Neutral"
                            else:
                                status = str(val)
                            
                            display_data.append({
                                "Feature": name,
                                "Value/Status": status
                            })
                        
                        st.table(display_data)
                        
                        # in work
                        if model_used == "rf_full" and not extended_checks:
                            st.info("💡 Some features were imputed with safe defaults because 'Extended checks' were disabled.")

            else:
                st.error(f"API Error: Received status code {response.status_code}")
                try:
                    st.json(response.json())
                except:
                    st.text(response.text)

        except requests.exceptions.Timeout:
            st.error("Request timed out. The backend might be busy or unreachable.")
        except requests.exceptions.ConnectionError:
            st.error("Connection Error: Could not connect to the backend.")
            st.info(f"Ensure that the FastAPI server is running at {API_URL.replace('/predict-url', '')}")
        except Exception as e:
            st.error(f"An unexpected error occurred: {str(e)}")


st.divider()

