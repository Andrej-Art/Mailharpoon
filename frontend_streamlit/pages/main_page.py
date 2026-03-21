# streamlit frontend

import os
import requests
import streamlit as st

# Configuration 
# Get backend URL from environment, default to local if not set
MAILHARPOON_BACKEND_URL = "https://mailharpoon-backend.onrender.com"
BASE_BACKEND_URL = os.getenv("MAILHARPOON_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
API_URL = f"{BASE_BACKEND_URL}/predict-url"
HEALTH_URL = f"{BASE_BACKEND_URL}/health"

# Page Layout 
st.title("ML Phishing URL Detector")
st.write("Enter a URL to check if it is legitimate or phishing.")

#  Sidebar 
# with st.sidebar:
#     st.header("Settings & Tools")
#     if st.button("Check Backend Health"):
#         try:
#             h_resp = requests.get(HEALTH_URL, timeout=5)
#             if h_resp.status_code == 200:
#                 st.success("Backend is online")
#             else:
#                 st.error(f"Backend error: {h_resp.status_code}")
#         except Exception:
#             st.error("Backend unreachable")
    
#     st.divider()
#     st.caption(f"Target: {API_URL}")


# URL Input Section 
with st.form(key='url_analyzer_form', clear_on_submit=False):
    col_input, col_submit = st.columns([4, 1])
    
    with col_input:
        url_input = st.text_input(
            "Enter URL:", 
            placeholder="https://example.com", 
            label_visibility="collapsed"
        ).strip()
    
    with col_submit:
        submit_button = st.form_submit_button(
            "Check and analyze your URL", 
            type="primary",
            use_container_width=True
        )

# Default to Full model and Extended checks
model_choice = "rf_full"
extended_checks = True

if submit_button:
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
                    timeout=60
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

                # Modern Probability Display
                legit_pct = legit_prob * 100
                phish_pct = phish_prob * 100
                
                # Determine emphasis and background
                legit_bg = "rgba(40, 167, 69, 0.15)" if legit_pct >= phish_pct else "rgba(255, 255, 255, 0.05)"
                phish_bg = "rgba(220, 53, 69, 0.15)" if phish_pct > legit_pct else "rgba(255, 255, 255, 0.05)"
                
                legit_color = "#28a745" if legit_pct >= phish_pct else "#888"
                phish_color = "#dc3545" if phish_pct > legit_pct else "#888"
                
                legit_border = "1px solid #28a745" if legit_pct >= phish_pct else "1px solid #444"
                phish_border = "1px solid #dc3545" if phish_pct > legit_pct else "1px solid #444"

                st.markdown(f"""
                    <div style="display: flex; gap: 15px; margin-top: 10px; margin-bottom: 25px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 160px; background: {legit_bg}; border: {legit_border}; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <div style="font-size: 0.85rem; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Legitimate</div>
                            <div style="font-size: 2rem; font-weight: 800; color: {legit_color};">{legit_pct:.1f}%</div>
                        </div>
                        <div style="flex: 1; min-width: 160px; background: {phish_bg}; border: {phish_border}; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <div style="font-size: 0.85rem; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Phishing</div>
                            <div style="font-size: 2rem; font-weight: 800; color: {phish_color};">{phish_pct:.1f}%</div>
                        </div>
                    </div>
                """, unsafe_allow_html=True)
                
                # Unified Network Intelligence & Page Preview Section
                fetch_info = data.get("fetch_info")
                metadata = data.get("feature_metadata", {})
                screenshot_info = metadata.get("screenshot_metadata")

                if fetch_info or screenshot_info:
                    with st.container(border=True):
                        st.subheader("🌐 Network Intelligence & Page Preview")
                        
                        col1, col2 = st.columns([1, 1], gap="large")
                        
                        with col1:
                            # Left Column: Network Info + Map
                            if fetch_info:
                                st.markdown("##### 📡 Network Details")
                                info_cols = st.columns(2)
                                info_cols[0].write(f"**Status:** `{fetch_info.get('status_code', 'N/A')}`")
                                info_cols[1].write(f"**Redirects:** `{fetch_info.get('redirect_count', 0)}` followed")
                                
                                st.write(f"**Resolved IP:** `{fetch_info.get('resolved_ip', 'Unknown')}`")
                                
                                geo = fetch_info.get("ip_info", {})
                                if geo and geo.get("status") == "success":
                                    st.write(f"**ISP:** {geo.get('isp')}")
                                    st.write(f"**Infrastructure:** {fetch_info.get('infrastructure', 'Origin Server')}")
                                    st.write(f"**Location:** {geo.get('city')}, {geo.get('country')}")
                                    
                                    # Show Map directly below info
                                    map_data = {"lat": [geo.get("lat")], "lon": [geo.get("lon")]}
                                    st.map(map_data, zoom=4)
                                    
                                    if "CDN" in fetch_info.get('infrastructure', ''):
                                        st.caption("📝 CDN infrastructure may serve content from multiple global locations.")
                                elif fetch_info.get("resolved_ip"):
                                    st.warning("Geolocation data unavailable.")
                                
                                if fetch_info.get("error"):
                                    st.error(f"**Fetch Error:** {fetch_info['error']}")
                            else:
                                st.info("Network details not available.")

                        with col2:
                            # Right Column: Screenshot + Meta
                            if screenshot_info:
                                st.markdown("##### 📸 Page Preview")
                                if screenshot_info.get("success"):
                                    screenshot_url = f"{BASE_BACKEND_URL}{screenshot_info['screenshot_url']}"
                                    st.image(screenshot_url, use_container_width=True)
                                    st.caption(f"**Captured at:** {screenshot_info.get('timestamp')}")
                                    st.write(f"**Final Destination:** `{screenshot_info.get('final_url')}`")
                                else:
                                    st.warning(f"Screenshot unavailable: {screenshot_info.get('error', 'Unknown')}")
                            else:
                                st.info("Page preview not available.")

               
                # Feature Breakdown
                st.subheader("Technical URL Analysis Report")
                features = data.get("features", {})
                metadata = data.get("feature_metadata", {})
                
                if features:
                    def get_status_info(val):
                        if val == -999: return "ℹ️", "Not Available", "secondary"
                        if val == 1: return "🚩", "Phishing / High Risk", "error"
                        if val == 0: return "⚠️", "Suspicious / Neutral", "warning"
                        return "✅", "Legitimate / Low Risk", "success"

                    # Mapping for technical insights
                    feature_configs = {
                        "having_ip_address": {
                            "name": "IP Address in Hostname",
                            "insight": "Legitimate websites typically use registered domain names. Direct IP access is uncommon and often associated with phishing or temporary malicious infrastructure.",
                            "get_val": lambda m: (
                                f"Hostname analyzed: {m.get('ip_metadata', {}).get('hostname') or m.get('hostname', 'N/A')}\n"
                                f"Detected pattern: {m.get('ip_metadata', {}).get('pattern') or ('Direct IP detected' if m.get('is_ip') else 'Registered domain')}\n"
                                f"Direct IP detected: {m.get('ip_metadata', {}).get('result') or ('Yes' if m.get('is_ip') else 'No')}"
                            )
                        },
                        "url_length": {
                            "name": "URL Length",
                            "insight": "Phishers use long URLs to hide malicious paths or obfuscate the real destination.",
                            "get_val": lambda m: f"{m.get('url_length')} characters"
                        },
                        "shortining_service": {
                            "name": "URL Shortener",
                            "insight": "Shortening services are used to bypass filters and hide the final destination.",
                            "get_val": lambda m: "Shortener detected" if m.get('shortener') else "No shortener used"
                        },
                        "having_at_symbol": {
                            "name": "@ Symbol Usage",
                            "insight": (
                                "Only '@' in the authority/userinfo section (e.g. paypal.com@evil.com) is phishing-relevant.\n"
                                "Attackers use it to mask the true destination domain.\n"
                                "@' in the URL path or query (e.g. medium.com/@user) is normal and not suspicious."
                            ),
                            "get_val": lambda m: (
                                f"'@' in authority/netloc: {m.get('at_symbol_metadata', {}).get('in_netloc', False)}\n"
                                f"Username prefix detected: {m.get('at_symbol_metadata', {}).get('username_present', False)}\n"
                                f"'@' in path: {m.get('at_symbol_metadata', {}).get('in_path', False)}\n"
                                f"'@' in query: {m.get('at_symbol_metadata', {}).get('in_query', False)}\n"
                                f"'@' in fragment: {m.get('at_symbol_metadata', {}).get('in_fragment', False)}\n"
                                f"Risk-relevant '@': {'Yes' if m.get('at_symbol') else 'No'}"
                            ) if m.get('at_symbol_metadata') else (
                                "'@' in authority: Yes" if m.get('at_symbol') else "No '@' usage detected in authority"
                            )
                        },
                        "having_sub_domain": {
                            "name": "Subdomain Nesting",
                            "insight": ("Deeply nested subdomains are often used to mimic legitimate brands (e.g., brand.com.security-update.xyz).\n"
                                        "Risk: 0-1 (Normal), 2-3 (Moderate), >3 (Suspicious)."),
                            "get_val": lambda m: (
                                f"Hostname analyzed: {m.get('sub_meta', {}).get('hostname') or m.get('hostname', 'N/A')}\n"
                                f"Registered domain: {m.get('sub_meta', {}).get('domain')}.{m.get('sub_meta', {}).get('suffix')}\n"
                                f"Detected subdomains: {'.'.join(m.get('sub_meta', {}).get('subdomains', [])) or 'none'}\n"
                                f"Subdomain depth: {m.get('sub_meta', {}).get('subdomain_count', 0)}"
                            ) if m.get('sub_meta') else (
                                f"{m.get('subdomain_count')} levels: {'.'.join(m.get('subdomains', [])) or 'None'}\n"
                                f"(Basic extraction fallback)"
                            )
                        },
                        "sslfinal_state": {
                            "name": "SSL/TLS State",
                            "insight": "HTTPS is standard for legitimate sites. Invalid, missing, or self-signed SSL is a critical warning.",
                            "get_val": lambda m: (
                                f"Valid TLS ({m.get('ssl_metadata', {}).get('issuer') or 'Verified'})\n"
                                f"Expires: {m.get('ssl_metadata', {}).get('expiry') or 'N/A'}\n"
                                f"Protocol: {m.get('ssl_metadata', {}).get('protocol') or 'N/A'}"
                            ) if features.get("sslfinal_state") == -1 else (
                                f"Invalid or missing SSL: {m.get('ssl_metadata', {}).get('error') or 'Unknown error'}"
                            )
                        },
                        "age_of_domain": {
                            "name": "Domain Age",
                            "insight": "Phishing campaigns typically rely on newly registered domains. Older domains are generally more trustworthy.",
                            "get_val": lambda m: (
                                f"{m.get('domain_age_days')} days (~{m.get('domain_age_days', 0)/365:.1f} years)\n"
                                f"Interpretation: {'Long-established domain' if m.get('domain_age_days', 0) > 730 else 'Recent domain'}"
                            ) if m.get('domain_age_days') else "Unknown"
                        },
                        "domain_registeration_length": {
                            "name": "Remaining Registration",
                            "insight": "Phishing domains are usually registered for the shortest possible period (1 year).",
                            "get_val": lambda m: f"{m.get('registration_length_days')} days remaining" if m.get('registration_length_days') else "Unknown"
                        },
                        "prefix_suffix": {
                            "name": "Prefix/Suffix Pattern",
                            "insight": lambda m: (
                                "Phishing domains often combine trusted brand names with terms like 'login', 'verify', or 'secure' to mimic legitimate services."
                                if m.get("prefix_suffix_metadata", {}).get("tokens") and any(kw in [t.lower() for t in m.get("prefix_suffix_metadata", {}).get("tokens", [])] for kw in ["paypal", "microsoft", "apple", "amazon", "login", "verify", "secure", "update", "account", "billing"]) else
                                "Hyphens in domains are common and not inherently suspicious. They become more relevant when combined with brand names and phishing-related keywords."
                            ),
                            "tech": lambda m: (
                                "The domain structure contains multiple hyphen-separated tokens, including brand-like or account/security-related terms."
                                if m.get("prefix_suffix_metadata", {}).get("tokens") and any(kw in [t.lower() for t in m.get("prefix_suffix_metadata", {}).get("tokens", [])] for kw in ["paypal", "microsoft", "apple", "amazon", "login", "verify", "secure", "update", "account", "billing"]) else
                                "No hyphen-based brand-mimicking pattern detected in the hostname."
                            ),
                            "get_val": lambda m: (
                                f"Hostname analyzed: {m.get('sub_meta', {}).get('hostname', 'Unknown')}\n"
                                f"Registered domain: {m.get('sub_meta', {}).get('domain', 'Unknown')}.{m.get('sub_meta', {}).get('suffix', '')}\n"
                                f"Hyphen in registered domain: {'Yes' if m.get('prefix_suffix_metadata', {}).get('has_hyphen_domain') else 'No'}\n"
                                f"Hyphen in subdomain: {'Yes' if m.get('prefix_suffix_metadata', {}).get('has_hyphen_subdomain') else 'No'}\n"
                                + (
                                    f"Hyphen-separated tokens: {m.get('prefix_suffix_metadata', {}).get('tokens', [])}"
                                    if m.get("prefix_suffix_metadata", {}).get("tokens") else ""
                                )
                            )
                        },
                        "favicon": {
                            "name": "Favicon Origin",
                            "insight": lambda m: (
                                "Using a locally hosted favicon is common and does not indicate phishing behavior."
                                if m.get("favicon_metadata", {}).get("is_same_domain") else
                                "Some phishing pages embed favicons from trusted brands to visually mimic legitimate websites."
                            ),
                            "tech": lambda m: (
                                "The favicon is hosted on the same registered domain as the page."
                                if m.get("favicon_metadata", {}).get("is_same_domain") else
                                "The favicon is loaded from a different registered domain."
                            ),
                            "get_val": lambda m: (
                                f"Page domain: {m.get('favicon_metadata', {}).get('page_domain', 'Unknown')}\n"
                                f"Favicon URL: {m.get('favicon_url', 'Unknown')}\n"
                                f"Favicon domain: {m.get('favicon_metadata', {}).get('favicon_domain', 'Unknown')}\n"
                                f"Same registered domain: {'Yes' if m.get('favicon_metadata', {}).get('is_same_domain') else 'No'}"
                            ) if m.get("favicon_metadata") else "Not evaluated"
                        },
                        "https_token": {
                            "name": "HTTPS Token in Hostname",
                            "insight": lambda m: (
                                "Attackers sometimes include 'https' in domain names (e.g. https-login-paypal.com) to create a false sense of security."
                                if m.get("https_token_metadata", {}).get("has_token") else
                                "Some phishing domains embed the word 'https' in the hostname to mimic secure websites."
                            ),
                            "tech": lambda m: (
                                "The hostname contains the token 'https'."
                                if m.get("https_token_metadata", {}).get("has_token") else
                                "The hostname does not contain the string 'https'."
                            ),
                            "get_val": lambda m: (
                                f"Hostname analyzed: {m.get('sub_meta', {}).get('hostname', 'Unknown')}\n"
                                f"HTTPS token in hostname: {'Yes' if m.get('https_token_metadata', {}).get('has_token') else 'No'}"
                                + (
                                    f"\nToken location: {'registered domain' if m.get('https_token_metadata', {}).get('in_domain') else 'subdomain'}"
                                    if m.get("https_token_metadata", {}).get("has_token") else ""
                                )
                            ) if m.get("https_token_metadata") else "Not evaluated"
                        },
                        "port": {
                            "name": "Port Usage",
                            "insight": lambda m: (
                                "Legitimate websites typically operate on standard ports such as 80 or 443."
                                if not m.get("port_metadata", {}).get("is_explicit") or m.get("port_metadata", {}).get("detected_port") in [80, 443] else
                                "Phishing kits and development servers sometimes operate on uncommon ports such as 8080 or 3000."
                            ),
                            "tech": lambda m: (
                                "The URL uses the default HTTPS/HTTP port."
                                if not m.get("port_metadata", {}).get("is_explicit") or m.get("port_metadata", {}).get("detected_port") in [80, 443] else
                                "The URL specifies a non-standard port."
                            ),
                            "get_val": lambda m: (
                                f"Scheme: {m.get('port_metadata', {}).get('scheme', 'Unknown')}\n"
                                f"Explicit port specified: {'Yes' if m.get('port_metadata', {}).get('is_explicit') else 'No'}\n"
                                f"{'Detected port' if m.get('port_metadata', {}).get('is_explicit') else 'Effective port'}: {m.get('port_metadata', {}).get('detected_port', 'Unknown')}"
                            ) if m.get("port_metadata") else "Not evaluated"
                        },
                        "dnsrecord": {
                            "name": "DNS Record Status",
                            "insight": "Legitimate websites must have valid DNS configurations (e.g., A, AAAA, CNAME) to route traffic appropriately.",
                            "get_val": lambda m: (
                                f"Hostname analyzed: {m.get('dns_metadata', {}).get('hostname', 'Unknown')}\n\n"
                                f"A records: {'Present' if m.get('dns_metadata', {}).get('a_record') else 'None'}\n"
                                f"AAAA records: {'Present' if m.get('dns_metadata', {}).get('aaaa_record') else 'None'}\n"
                                f"CNAME records: {m.get('dns_metadata', {}).get('cname_target') if m.get('dns_metadata', {}).get('cname_record') else 'None'}\n"
                                f"NS records: {'Present' if m.get('dns_metadata', {}).get('ns_record') else 'None'}\n\n"
                                f"DNS Resolution: {m.get('dns_metadata', {}).get('resolution', 'Unknown')}"
                                + (f"\nNote: {m['dns_metadata']['note']}" if m.get('dns_metadata', {}).get('note') else "")
                            ) if m.get('dns_metadata') else (
                                "Record found via basic DNS check" if features.get('dnsrecord') == -1 else "No DNS record found"
                            )
                        },
                        "double_slash_redirecting": {
                            "name": "Double Slash Redirecting",
                            "insight": "Attackers sometimes insert extra slash segments to make URLs appear legitimate or hide malicious path components.",
                            "tech": lambda m: (
                                "URL contains multiple slash delimiters that may obscure the path structure."
                                if m.get("double_slash_metadata", {}).get("has_extra_double_slash") else
                                "No double-slash pattern detected beyond the protocol delimiter."
                            ),
                            "get_val": lambda m: (
                                "Additional '//' detected after hostname"
                                if m.get("double_slash_metadata", {}).get("has_extra_double_slash") else
                                "Additional '//' after scheme: No"
                            )
                        },
                        "abnormal_url": {
                            "name": "Abnormal URL / Infrastructure Check",
                            "insight": lambda m: (
                                "The hostname does not align with the underlying hosting infrastructure or SSL certificate."
                                if m.get("abnormal_url_metadata", {}).get("is_consistent") is False else
                                "The hostname aligns with the DNS resolution and hosting infrastructure."
                            ),
                            "tech": lambda m: (
                                "A mismatch was detected between the URL hostname and the SSL certificate's Common Name or Subject Alternative Names."
                                if m.get("abnormal_url_metadata", {}).get("is_consistent") is False else
                                f"Infrastructure verified: {m.get('abnormal_url_metadata', {}).get('detected_infrastructure', 'Standard Server')}."
                            ),
                            "get_val": lambda m: (
                                f"URL hostname: {m.get('hostname', 'N/A')}\n"
                                f"Resolved IP: {m.get('abnormal_url_metadata', {}).get('resolved_ip', 'N/A')}\n"
                                f"Infrastructure: {m.get('abnormal_url_metadata', {}).get('detected_infrastructure', 'Unknown')}\n"
                                f"Infrastructure consistency: {'✅ Valid' if m.get('abnormal_url_metadata', {}).get('is_consistent') else '🚩 Inconsistent / Mismatch'}"
                            ) if m.get("abnormal_url_metadata") else "Not evaluated"
                        },
                        "redirect": {
                            "name": "Redirect Count",
                            "insight": (
                                "Redirect chains are common for URL shorteners, tracking, and HTTP→HTTPS upgrades.\n"
                                "Unusually long redirect chains can indicate attempts to obscure the final destination.\n"
                                "Risk: 0-1 (Low), 2 (Neutral), 3+ (Suspicious)."
                            ),
                            "get_val": lambda m: (
                                f"Redirect chain length: {fetch_info.get('redirect_count', 0)}\n"
                                + (
                                    "Redirect path:\n" +
                                    " → ".join(fetch_info.get("redirect_chain", [])) +
                                    f" → {fetch_info.get('final_url', 'N/A')}"
                                    if fetch_info.get("redirect_chain") else
                                    f"Final URL: {fetch_info.get('final_url', 'N/A')}"
                                )
                            ) if fetch_info else "N/A"
                        },
                        "request_url": {
                            "name": "External Assets Ratio",
                            "insight": ("A high ratio of external images/scripts can indicate a cloned site fetching assets from the original.\n"
                                        "However, many legitimate sites use CDNs, Google Fonts, and external analytics.\n"
                                        "Risk: <22% (Low), 22-61% (Normal/Moderate), >61% (Context dependent)."),
                            "get_val": lambda m: (
                                "Not available\nPage content could not be fully fetched or parsed."
                                if m.get('request_url_available') is False else
                                f"Total assets: {m.get('total_assets', 0)}\n"
                                f"External assets: {m.get('external_assets', 0)}\n"
                                f"External asset ratio: {m.get('request_url_ratio', 0)*100:.1f}%"
                                if m.get('total_assets') is not None else "N/A"
                            )
                        },
                        "links_in_tags": {
                            "name": "Links in Tags (Meta/Script/Link)",
                            "insight": lambda m: (
                                "Phishing pages sometimes reuse scripts and styles from legitimate sites they attempt to imitate."
                                if m.get("links_in_tags_metadata", {}).get("ratio", 0) > 0.3 else
                                "Legitimate websites typically serve their resources from their own infrastructure or trusted CDN services."
                            ),
                            "tech": lambda m: (
                                "A large proportion of assets are loaded from external domains."
                                if m.get("links_in_tags_metadata", {}).get("ratio", 0) > 0.3 else
                                "Most assets are hosted on the same registered domain."
                            ),
                            "get_val": lambda m: (
                                f"Total assets analyzed: {m.get('links_in_tags_metadata', {}).get('total', 0)}\n"
                                f"Internal resources: {m.get('links_in_tags_metadata', {}).get('internal', 0)}\n"
                                f"External resources: {m.get('links_in_tags_metadata', {}).get('external', 0)}\n"
                                f"External ratio: {m.get('links_in_tags_metadata', {}).get('ratio', 0) * 100:.1f}%"
                            ) if m.get("links_in_tags_metadata") else "Not evaluated"
                        },
                        "url_of_anchor": {
                            "name": "Suspicious Anchors",
                            "insight": (
                                "Suspicious anchor patterns include empty links (#), JavaScript pseudo-links, "
                                "and login/CTA text pointing to unrelated external domains.\n"
                                "Risk: <31% (Low), 31-67% (Neutral), >67% (Suspicious)."
                            ),
                            "get_val": lambda m: (
                                "Not available\nPage content could not be fetched or parsed, so anchor analysis was not possible."
                                if m.get('url_of_anchor_available') is False else
                                f"Total anchors: {m.get('total_anchors', 0)}\n"
                                f"Empty/hash anchors: {m.get('empty_hash_anchors', 0)}\n"
                                f"JavaScript anchors: {m.get('javascript_anchors', 0)}\n"
                                f"External anchors: {m.get('external_anchors', 0)}\n"
                                f"Misleading CTA anchors: {m.get('cta_anchors', 0)}"
                                if m.get('total_anchors') is not None else "N/A"
                            )
                        },
                        "sfh": {
                            "name": "Server Form Handler (SFH)",
                            "insight": lambda m: (
                                "Phishing pages frequently send stolen credentials to attacker-controlled servers."
                                if m.get("sfh_metadata", {}).get("external") > 0 else
                                ("Empty form actions can be used dynamically with JavaScript, but are also common in SPA frameworks."
                                 if m.get("sfh_metadata", {}).get("empty") > 0 else
                                 "Legitimate websites typically process login and account forms on their own infrastructure.")
                            ),
                            "tech": lambda m: (
                                "Data submits to an external or unknown domain."
                                if m.get("sfh_metadata", {}).get("external") > 0 else
                                ("Form(s) contain empty, blank, or JavaScript-based action handlers."
                                 if m.get("sfh_metadata", {}).get("empty") > 0 else
                                 "All forms submit data to endpoints within the same registered domain.")
                            ),
                            "get_val": lambda m: (
                                f"Forms detected: {m.get('sfh_metadata', {}).get('total', 0)}\n"
                                f"Internal form handlers: {m.get('sfh_metadata', {}).get('internal', 0)}\n"
                                f"External form handlers: {m.get('sfh_metadata', {}).get('external', 0)}\n"
                                f"Empty actions: {m.get('sfh_metadata', {}).get('empty', 0)}"
                                + (
                                    "\nExternal Action URLs:\n" + "\n".join([f"- {u}" for u in m.get('sfh_metadata', {}).get('external_urls', [])])
                                    if m.get('sfh_metadata', {}).get('external_urls') else ""
                                )
                            ) if m.get("sfh_metadata") else "Not evaluated"
                        },
                        "submitting_to_email": {
                            "name": "Submitting to Email (mailto:)",
                            "insight": lambda m: (
                                "Phishing pages sometimes send stolen credentials directly to attacker-controlled email addresses using mailto form actions."
                                if m.get("submitting_to_email_metadata", {}).get("has_mailto_form") else
                                "Legitimate websites typically send form data to server-side endpoints rather than using email submission handlers."
                            ),
                            "tech": lambda m: (
                                "One or more forms on this page submit data using the mailto: protocol."
                                if m.get("submitting_to_email_metadata", {}).get("has_mailto_form") else
                                "No forms submit data via email handlers."
                            ),
                            "get_val": lambda m: (
                                f"Forms analyzed: {m.get('submitting_to_email_metadata', {}).get('forms_checked', 0)}\n"
                                f"Email form submission detected: {'Yes' if m.get('submitting_to_email_metadata', {}).get('has_mailto_form') else 'No'}"
                                + (
                                    "\nDetected mailto actions:\n" + "\n".join([f"- {u}" for u in m.get('submitting_to_email_metadata', {}).get('mailto_actions', [])])
                                    if m.get('submitting_to_email_metadata', {}).get('mailto_actions') else ""
                                )
                            ) if m.get("submitting_to_email_metadata") else "Not evaluated"
                        },
                        "on_mouseover": {
                            "name": "Hover Interaction Safety",
                            "insight": lambda m: (
                                "Phishing pages sometimes manipulate link previews to hide the real destination of malicious URLs."
                                if m.get("on_mouseover_metadata", {}).get("is_suspicious") else
                                "Hover events are commonly used for UI interactions and are not inherently suspicious."
                            ),
                            "tech": lambda m: (
                                "Mouseover event modifies link status information or performs unexpected redirects."
                                if m.get("on_mouseover_metadata", {}).get("is_suspicious") else
                                "Mouseover events are present but do not manipulate link destinations."
                            ),
                            "get_val": lambda m: (
                                f"Hover event handlers detected: {m.get('on_mouseover_metadata', {}).get('total_hover_handlers', 0)}\n"
                                f"Suspicious manipulation detected: {'Yes' if m.get('on_mouseover_metadata', {}).get('is_suspicious') else 'No'}"
                                + (
                                    "\nSuspicious code found:\n" + "\n".join([f"- {s}" for s in m.get('on_mouseover_metadata', {}).get('malicious_scripts_found', [])])
                                    if m.get('on_mouseover_metadata', {}).get('malicious_scripts_found') else ""
                                )
                            ) if m.get("on_mouseover_metadata") else "Not evaluated"
                        },
                        "rightclick": {
                            "name": "Right-Click Context Menu",
                            "insight": lambda m: (
                                "JavaScript prevents the browser context menu from opening. Attackers sometimes do this to hide malicious code from inspection."
                                if m.get("rightclick_metadata", {}).get("is_blocked") else
                                "Some phishing pages disable right-click functionality to prevent users from inspecting malicious links."
                            ),
                            "tech": lambda m: (
                                "JavaScript code blocking the context menu was detected."
                                if m.get("rightclick_metadata", {}).get("is_blocked") else
                                "No JavaScript code blocking the context menu was detected."
                            ),
                            "get_val": lambda m: (
                                f"Context menu blocking detected: {'Yes' if m.get('rightclick_metadata', {}).get('is_blocked') else 'No'}\n"
                                f"Blocking method: {m.get('rightclick_metadata', {}).get('blocking_method', 'None')}\n"
                                f"Contextmenu event handlers: {m.get('rightclick_metadata', {}).get('handler_count', 0)}"
                            ) if m.get("rightclick_metadata") else "Not evaluated"
                        },
                        "popupwidnow": {
                            "name": "Popup Window Analysis",
                            "insight": lambda m: (
                                "JavaScript popup functions detected in page scripts. Attackers may use popup dialogs to request sensitive information or redirect users."
                                if m.get("popupwidnow_metadata", {}).get("is_detected") else
                                "Phishing pages sometimes use popup dialogs to request credentials or mislead users."
                            ),
                            "tech": lambda m: (
                                "JavaScript popup functions (alert/window.open) detected in page scripts."
                                if m.get("popupwidnow_metadata", {}).get("is_detected") else
                                "No browser popup dialog functions detected in page scripts."
                            ),
                            "get_val": lambda m: (
                                f"window.open calls detected: {m.get('popupwidnow_metadata', {}).get('counts', {}).get('window.open', 0)}\n"
                                f"alert dialogs detected: {m.get('popupwidnow_metadata', {}).get('counts', {}).get('alert', 0)}\n"
                                f"prompt dialogs detected: {m.get('popupwidnow_metadata', {}).get('counts', {}).get('prompt', 0)}\n"
                                f"confirm dialogs detected: {m.get('popupwidnow_metadata', {}).get('counts', {}).get('confirm', 0)}"
                            ) if m.get("popupwidnow_metadata") else "Not evaluated"
                        },
                        "iframe": {
                            "name": "Iframe Analysis",
                            "insight": lambda m: (
                                "A hidden iframe was detected. Hidden iframes are sometimes used by phishing pages to load malicious content or perform invisible redirects."
                                if m.get("iframe_metadata", {}).get("hidden_iframes", 0) > 0 else
                                "Iframes detected but none are hidden or suspicious. Legitimate websites often embed external content such as videos or widgets using iframes."
                            ),
                            "tech": lambda m: (
                                "One or more iframes are hidden from the user (zero dimensions or invisible style)."
                                if m.get("iframe_metadata", {}).get("hidden_iframes", 0) > 0 else
                                "All detected iframes are visible and use standard embedding patterns."
                            ),
                            "get_val": lambda m: (
                                f"Total iframes detected: {m.get('iframe_metadata', {}).get('total_iframes', 0)}\n"
                                f"Hidden iframes: {m.get('iframe_metadata', {}).get('hidden_iframes', 0)}\n"
                                f"External iframe domains: {m.get('iframe_metadata', {}).get('external_iframes', 0)}"
                                + (
                                    "\nExternal source domains:\n" + "\n".join([f"- {d}" for d in m.get('iframe_metadata', {}).get('external_iframe_domains', [])])
                                    if m.get('iframe_metadata', {}).get('external_iframe_domains') else ""
                                )
                            ) if m.get("iframe_metadata") else "Not evaluated"
                        },
                        "google_index": {
                            "name": "Google Index Status",
                            "insight": lambda m: (
                                "The domain appears in Google search results. Legitimate websites are commonly indexed."
                                if m.get("google_index_metadata", {}).get("is_indexed") else
                                "The domain does not appear in Google search results. Newly created phishing domains are often not indexed."
                            ),
                            "tech": lambda m: (
                                m.get("google_index_metadata", {}).get("technical_interpretation", "Status unknown.")
                            ),
                            "get_val": lambda m: (
                                f"Domain analyzed: {m.get('google_index_metadata', {}).get('domain_analyzed', 'N/A')}\n"
                                f"Google indexed: {'Yes' if m.get('google_index_metadata', {}).get('is_indexed') else 'No'}\n"
                                f"Index status: {m.get('google_index_metadata', {}).get('status', 'Unknown')}"
                            ) if m.get("google_index_metadata") else "Not evaluated"
                        },
                        "statistical_report": {
                            "name": "Domain Reputation Analysis",
                            "insight": lambda m: (
                                "The domain appears in one or more phishing reputation databases. Threat intelligence feeds indicate it has been associated with malicious campaigns."
                                if (m.get("reputation_metadata", {}).get("risk_score", -1) >= 0) else
                                "No matches were found in external threat intelligence databases. Legitimate domains are typically absent from these feeds."
                            ),
                            "tech": lambda m: (
                                f"Reputation Status: {m.get('reputation_metadata', {}).get('status', 'Unknown')}"
                            ),
                            "get_val": lambda m: (
                                f"Domain analyzed: {m.get('reputation_metadata', {}).get('domain_analyzed', 'N/A')}\n"
                                f"Matches found: {'Yes' if m.get('reputation_metadata', {}).get('urlhaus_match') else 'No'}\n"
                                f"URLHaus detections: {m.get('reputation_metadata', {}).get('urlhaus_detections', 0)}\n"
                                f"Intelligence sources: {', '.join(m.get('reputation_metadata', {}).get('sources', [])) if m.get('reputation_metadata', {}).get('sources') else 'None'}"
                            ) if m.get("reputation_metadata") else "Not evaluated"
                        },
                        "page_rank": {
                            "name": "Domain Popularity",
                            "insight": lambda m: (
                                "Domain popularity could not be evaluated. This signal should not influence the phishing classification."
                                if m.get('page_rank_metadata', {}).get('is_available') is False else
                                "Highly visible and widely referenced domains are less commonly used in disposable phishing campaigns. This signal supports legitimacy but does not guarantee safety."
                            ),
                            "tech": lambda m: (
                                "No external domain authority or popularity provider is available."
                                if m.get('page_rank_metadata', {}).get('is_available') is False else
                                "Domain has measurable public visibility and web presence."
                            ),
                            "get_val": lambda m: (
                                f"Registered domain: {m.get('page_rank_metadata', {}).get('domain', 'N/A')}\n"
                                "Popularity source: not configured"
                            ) if m.get('page_rank_metadata', {}).get('is_available') is False else (
                                f"Registered domain: {m.get('page_rank_metadata', {}).get('domain', 'N/A')}\n"
                                f"Popularity score: {m.get('page_rank_metadata', {}).get('signal', 'high')}\n"
                                "Authority confidence: medium\n"
                                "Source: configured reputation provider"
                            )
                        }
                    }

                    # Iterate through features that we have a config for
                    for fid, config in feature_configs.items():
                        if fid in features:
                            val = features[fid]
                            
                            # Intercept unavailable states to show neutral info card
                            if fid == "request_url" and metadata.get("request_url_available") is False:
                                val = -999
                            elif fid == "url_of_anchor" and metadata.get("url_of_anchor_available") is False:
                                val = -999
                            elif fid == "page_rank" and metadata.get("page_rank_metadata", {}).get("is_available") is False:
                                val = -999
                                
                            icon, label, color = get_status_info(val)
                            
                            with st.expander(f"{icon} **{config['name']}**: {label}"):
                                c1, c2 = st.columns([1, 2])
                                with c1:
                                    st.write("**Observed Value:**")
                                    st.code(config["get_val"](metadata))
                                with c2:
                                    if "tech" in config:
                                        st.write("**Technical Interpretation:**")
                                        tech_text = config["tech"](metadata) if callable(config["tech"]) else config["tech"]
                                        st.info(tech_text)
                                    st.write("**Security Insight:**")
                                    insight_text = config["insight"](metadata) if callable(config["insight"]) else config["insight"]
                                    st.info(insight_text)

                    # Show remaining features in a simpler way if they are relevant
                    other_features = [f for f in features if f not in feature_configs and features[f] != 0]
                    if other_features:
                        with st.expander("Other Detected Indicators (Simplified)"):
                            for f in other_features:
                                icon, label, _ = get_status_info(features[f])
                                st.write(f"{icon} **{f}**: {label}")
                        
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

