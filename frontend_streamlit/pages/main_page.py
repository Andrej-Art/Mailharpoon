# streamlit frontend

import requests
import streamlit as st

# --- Configuration ---
# Lokaler API-Endpoint für die URL-basierte Inferenz
API_URL = "http://127.0.0.1:8000/predict-url"
HEALTH_URL = "http://127.0.0.1:8000/health"

# --- Page Layout ---
st.title("ML Phishing URL Detector")
st.write("Enter a URL to check if it is legitimate or phishing.")

# --- Sidebar / Health Check ---
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

# --- URL Input Section ---
url_input = st.text_input("Enter URL:", placeholder="https://example.com").strip()

if st.button("Check and analyze your URL", type="primary"):
    if not url_input:
        st.warning("Please enter a URL first.")
    else:
        try:
            with st.spinner("Analyzing URL..."):
                # Header setzen für JSON Request
                headers = {"Content-Type": "application/json"}
                payload = {"url": url_input}
                
                response = requests.post(
                    API_URL, 
                    json=payload, 
                    headers=headers, 
                    timeout=15
                )

            if response.status_code == 200:
                data = response.json()
                
                # Extraktion der Daten aus der Response
                prediction = data.get("prediction", "Unknown")
                phish_prob = data.get("phishing_probability", 0.0)
                legit_prob = data.get("legit_probability", 0.0)
                threshold = data.get("threshold", 0.5)
                
                # Ergebnisanzeige
                if prediction == "Malicious":
                    st.error(f"### 🚨 Prediction: {prediction}")
                else:
                    st.success(f"### ✅ Prediction: {prediction}")
                
                # Metriken anzeigen
                col1, col2 = st.columns(2)
                col1.metric("Phishing Prob.", f"{phish_prob:.3f}")
                col2.metric("Legit Prob.", f"{legit_prob:.3f}")
               
                # to display threshold value for the user
                #st.caption(f"Classification threshold currently at {threshold:.2f}")

                # --- Feature Breakdown ---
                st.write("### URL Feature Breakdown")
                features = data.get("features", {})
                
                if features:
                    # Map feature keys to readable names and format values
                    feature_mapping = {
                        "having_ip_address": "Contains IP Address",
                        "url_length": "URL Length",
                        "shortining_service": "Uses Shortener Service",
                        "having_at_symbol": "Contains '@' Symbol",
                        "double_slash_redirecting": "Redirection via '//'",
                        "prefix_suffix": "Prefix/Suffix in Host",
                        "having_sub_domain": "Multiple Subdomains",
                        "https_token": "'https' Token in Host"
                    }
                    
                    # Convert to a list of dicts for display
                    display_data = []
                    for key, readable_name in feature_mapping.items():
                        val = features.get(key)
                        
                        # Formatting numeric values to human-readable text if they are -1/1
                        if key == "url_length":
                            status = f"{val} characters"
                        else:
                            status = "✅ Yes" if val == 1 else "❌ No"
                        
                        display_data.append({
                            "Feature": readable_name,
                            "Detail": status
                        })
                    
                    st.table(display_data)
                
                # Removed "Show raw API Response" as requested
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
            st.info("Ensure that the FastAPI server is running at http://127.0.0.1:8000")
        except Exception as e:
            st.error(f"An unexpected error occurred: {str(e)}")

# --- Debug Info ---
st.divider()

