import streamlit as st
import pandas as pd

st.title("About the Mailharpoon Project")

# Section 1: About the Project
with st.expander("1. About the Project", expanded=True):
    st.markdown("""
    **Mailharpoon** is an intelligent analysis tool designed to protect users from deceptive websites and phishing attempts.
    
    **The mission:** To leverage machine learning and real-time network intelligence to identify malicious URLs before they can compromise your security.
    
    Whether you are a security professional or an everyday web user, Mailharpoon provides the transparency and insights needed to navigate the web safely.
    """)

# Section 2: The Phishing Problem
with st.expander("2. The Phishing Problem", expanded=False):
    st.markdown("""
    Phishing remains one of the most pervasive cyber threats globally. Modern attacks have evolved from simple "bad spelling" emails into sophisticated, AI-driven replicas of trusted financial institutions and services.
    
    The danger lies in targeting the human element rather than just technical vulnerabilities. A single click can lead to identity theft, financial loss, or act as an entry point for ransomware. Because attackers constantly rotate domains and use "polymorphic" URLs, traditional blacklists often struggle to keep up.
    """)

# Section 3: How Mailharpoon Works
with st.expander("3. How Mailharpoon Works", expanded=False):
    st.markdown("""
    Our analysis process is transparent and multi-layered:
    1. **Input:** You enter a suspicious URL into the analyzer.
    2. **Extraction:** The system scans over 30 distinct features of the URL, the page structure, and the underlying network infrastructure.
    3. **Inference:** A Random Forest machine learning model compares these patterns against thousands of verified safe and malicious sites.
    4. **Prediction:** You receive a clear risk assessment (Legitimate or Malicious) alongside a detailed technical breakdown of *why* the site was flagged.
    """)

# Section 4: Data & Machine Learning
with st.expander("4. Data & Machine Learning", expanded=False):
    st.markdown("""
    Mailharpoon is built on a foundation of data-driven security. The core model was trained using the **Website Phishing Dataset** from the **UC Irvine Machine Learning Repository** (https://archive.ics.uci.edu/dataset/327/phishing+websites), which contains thousands of labeled URLs analyzed across 30 different attributes. 
    
    In addition, other phishing-related datasets and feature sets were evaluated during development. This mathematical approach allows us to detect subtle "tells" that humans might miss—such as unusual link ratios or suspicious domain registration patterns. We prioritize "Explainable AI," ensuring that every prediction is supported by visible metrics.
    """)

# Section 5: Analyzed Features (Full Overview)
with st.expander("5. Full Overview of Analyzed Features", expanded=False):
    st.markdown("""
    The Mailharpoon model analyzes the following 30 parameters to determine the risk level of a URL:
    """)
    
    # Full Feature Table (30 Features based on original UCI set)
    data = {
        "Feature": [
            "having_IP_Address", "URL_Length", "Shortining_Service", "having_At_Symbol",
            "double_slash_redirecting", "Prefix_Suffix", "having_Sub_Domain", "SSLfinal_State",
            "Domain_Registeration_Length", "Favicon", "port", "HTTPS_token",
            "Request_URL", "URL_of_Anchor", "Links_in_tags", "SFH",
            "Submitting_to_email", "Abnormal_URL", "Redirect", "on_mouseover",
            "RightClick", "popUpWindow", "Iframe", "age_of_domain",
            "DNSRecord", "web_traffic", "Page_Rank", "Google_Index",
            "Links_pointing_to_page", "Statistical_report"
        ],
        "Description": [
            "URL contains an IP address instead of a domain name.",
            "Overall length of the URL (long URLs are often suspicious).",
            "Use of URL shortening services (e.g., bit.ly).",
            "Presence of '@' symbol in the URL.",
            "Presence of '//' in the path (redirection indicator).",
            "Presence of hyphens '-' in the domain name.",
            "Number of subdomains (more than two is suspicious).",
            "Status of HTTPS/SSL (Issuer, validity, and encryption).",
            "Remaining time until domain registration expires.",
            "Favicon loaded from a domain different than the URL.",
            "Use of non-standard ports for web traffic.",
            "Presence of 'HTTPS' token in the domain part.",
            "Percentage of external objects (images, scripts) loaded.",
            "Percentage of anchors leading to different domains.",
            "Percentage of links in meta, script, and link tags.",
            "Server Form Handler (empty or external form actions).",
            "Use of 'mailto:' or 'mail()' functions on the page.",
            "Host name not matching the claimed identity.",
            "Number of redirects (more than 2-3 is suspicious).",
            "Manipulation of status bar via mouseover events.",
            "Disabling the right-click menu to hide source code.",
            "Use of automatic pop-up windows.",
            "Use of invisible iframes to overlay content.",
            "Time elapsed since the domain was first registered.",
            "Existence of a valid DNS record for the domain.",
            "Website popularity rank (e.g., Alexa/Tranco rank).",
            "Importance of the page based on inbound links.",
            "Whether the page is indexed by Google.",
            "Total number of external links pointing to the page.",
            "Presence on known phishing or malware blacklists."
        ]
    }

    df = pd.DataFrame(data)
    df.index = df.index + 1 
    st.table(df)

# Section 6: Network Intelligence & Analysis
with st.expander("6. Network Intelligence & Analysis", expanded=False):
    st.markdown("""
    A URL is only the surface. Mailharpoon performs deep background verification to uncover the hidden infrastructure of a site:
    - **IP & Hosting:** We resolve the domain and identify the hosting provider to spot high-risk infrastructure.
    - **Geolocation:** We estimate the physical server location to detect regional discrepancies.
    - **Redirect Tracking:** We follow the full chain of redirects to see the ultimate destination of a link.
    - **Visual Capture:** We take a secure snapshot of the page, allowing you to safely preview the site's appearance.
    
    This deep intelligence helps reveal the intent behind a link, beyond what is visible in the browser address bar.
    """)

# Section 7: Limitations & Responsible Use
with st.expander("7. Limitations & Responsible Use", expanded=False):
    st.markdown("""
    While Mailharpoon utilizes advanced modeling, no automated system is 100% infallible. Cybercriminals are constantly innovating to bypass security filters.
    
    Occasionally, safe sites may be flagged as suspicious (False Positive), or brand-new threats might be missed (False Negative). Mailharpoon is designed to **support** your judgment, not replace it. Always remain cautious when interacting with unknown links.
    """)

# Section 8: Project Goal & Vision
with st.expander("8. Project Goal & Vision", expanded=False):
    st.markdown("""
    The vision for Mailharpoon is to bridge the gap between complex security data and user understanding. We want to build a tool that isn't just a "black box," but an educational resource that empowers users.
    
    By combining state-of-the-art machine learning with clear, explainable insights, we aim to help users understand *how* phishing works, enabling everyone to build a more resilient and safer internet.
    """)

# Section 9: The future of Mailharpoon
with st.expander("9. The future of the Mailharpoon Project", expanded=False):
    st.markdown("""
Mailharpoon will continue to evolve as we work on improving both the quality and quantity of our data. By incorporating more recent and diverse datasets, we aim to continuously refine our machine learning models and achieve more accurate and reliable phishing predictions.

In addition, new features will be introduced to enhance usability and provide more value to users. Planned improvements include the ability to export key analysis results of a scanned URL in multiple formats such as JSON, TXT, and PDF, enabling easy sharing and documentation.

Looking ahead, Mailharpoon will expand beyond URL analysis into a broader security intelligence platform. One of the next steps is the development of email account analysis, allowing users to identify which accounts are most exposed to phishing threats and at higher risk. This will help organizations and individuals better understand their attack surface and take proactive security measures.
""")


