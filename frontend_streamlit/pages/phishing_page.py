import streamlit as st
import pandas as pd

st.title("About the Mailharpoon Project")


with st.expander("**About the general Phishing Problem**", expanded=False):
    st.markdown("""
Phishing attacks remain one of the most critical cybersecurity threats worldwide. In 2025, phishing activity reached an all-time high, with over one million reported attacks in a single quarter. Modern phishing campaigns increasingly leverage AI-generated content, making fraudulent emails, messages, and websites more convincing and harder to detect.

Traditional blacklist and rule-based security mechanisms struggle to keep pace with rapidly evolving and polymorphic attack patterns. As phishing expands across email, SMS, voice, and social media platforms, there is a growing need for intelligent, adaptive detection systems capable of identifying malicious content in real time.

Therefore, developing an automated phishing detection system is essential to reduce successful attacks and better protect users’ sensitive information.
""")



with st.expander("**About the Data**", expanded=False):

    st.markdown("""
    This project primarily uses the Website Phishing Dataset from the UC Irvine Machine Learning Repository, 
    containing 1,353 labeled URLs with 9 feature attributes and 1 class label (legitimate, suspicious, phishing). 
    
    In addition, other phishing-related datasets and feature sets were evaluated. However, many traditional 
    URL-based features showed high false-positive rates in real-world scenarios.
    """)

    # Full Feature Table (30 Features based on rf_full)
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

    st.subheader("Model Feature Overview (30 Features)")
    st.table(df)


