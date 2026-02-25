# streamlit frontend

import requests
import streamlit as st

# Set page config
st.title("ML Phishing URL Detector")
st.write("Enter a URL to check if it is legitimate or phishing.")

# function to extract features from user url input 


# function to predict using API# URL input
url = st.text_input("Enter URL:", placeholder="https://example.com")

#check button
st.button("Check and analyze your URL")

