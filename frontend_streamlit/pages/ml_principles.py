import streamlit as st

st.title("Machine Learning Principles")

#choose ML Model and analyse our URL with insights
option =st.selectbox(
    "Choose your Machine Learning Model:",
    ("Logistic Regression", "K-Nearest Neighbours", "Support Vector Machine Classifier", "Naive Bayes Classifier", "Decision Trees Classifier", 
    "Decision Trees Classifier", "Random Forrest Classifier", "Gradient Boosting Classifier", "XG Boost Classifier", "Multi-layer Perceptron Classifier")
)