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

    # Feature Table
    data = {
        "Feature": [
            "SFH",
            "popUpWindow",
            "SSLfinal_State",
            "Request_URL",
            "URL_of_Anchor",
            "web_traffic",
            "URL_Length",
            "age_of_domain",
            "having_IP_Address",
            "Result"
        ],
        "Description": [
            "Where the website's form data is submitted to",
            "Whether the website has pop-up windows",
            "Status of the SSL certificate (HTTPS or HTTP)",
            "Where images and other resources are loaded from",
            "Where links on the page point to",
            "How popular the website is",
            "Length of the URL",
            "Age of the domain",
            "If the URL uses an IP address instead of a domain name",
            "Classification (1: Legitimate, 0: Suspicious, -1: Phishing)"
        ]
    }

    df = pd.DataFrame(data)
    df.index = df.index + 1 

    st.subheader("Dataset Features")
    st.table(df)


