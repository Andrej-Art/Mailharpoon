import streamlit as st

# website header
st.title("About Phishing")

st.markdown(
    "<p style='color:#FF7A00; font-size:0.85rem;'>"
    "<strong>Mailharpoon helps you understand phishing — what it is, how it works, and how to stay protected."
    "</p>",
    unsafe_allow_html=True
)


st.info(
    """
**Phishing at a Glance**

Phishing is a form of cybercrime where attackers impersonate legitimate organizations or individuals
to trick people into revealing sensitive information such as passwords, credit card numbers, banking details, or personal data.

These attacks typically arrive through **emails, text messages, phone calls, or malicious websites**
that appear to come from trusted sources like banks, delivery services, social media platforms, or well-known companies.
""",
    icon=":material/phishing:",
)

st.write("")

with st.expander("How Phishing Attacks Work", expanded=False):
    st.markdown(
        """
Phishing is a **social engineering attack** where a target (an individual or organization) is contacted by
email, phone, or text message by someone posing as a legitimate institution.

The goal is to manipulate the victim into:

- Revealing **login credentials**
- Sharing **financial information**
- Providing **personally identifiable information (PII)**
- Downloading **malware**
- Transferring money under false pretenses

Phishing works because attackers exploit **trust, urgency, fear, and authority**.
"""
    )


with st.expander("Why Should You Care About Phishing?", expanded=False):
    st.markdown("""
The purpose of phishing is to collect sensitive information and use it to gain access 
to protected systems, accounts, or networks.

Successful phishing attacks can:

- Cause **financial loss**
- Compromise **personal data**
- Put **company systems and confidential data** at risk
- Lead to **account takeovers**
- Serve as an entry point for **ransomware attacks**

Phishing is one of the most common and effective cyberattack methods worldwide.
""")


with st.expander("Two Major Types of Phishing Attacks", expanded=False):
    st.markdown("""
### 1) Deceptive Phishing
The most common form. Attackers impersonate a legitimate company to steal personal data or login credentials.
These emails often use threats or urgency such as:
- “Your account will be suspended”
- “Payment failed”
- “Immediate action required”

### 2) Spear Phishing
A targeted attack aimed at a specific individual, role, or company.
Attackers research their victims (LinkedIn, company websites, social media) 
to make messages appear authentic and personalized.
""")

with st.expander("Other Phishing Techniques", expanded=False):
    st.markdown("""
- **Email Phishing** – Fraudulent emails requesting personal information or login credentials.
- **Smishing** – Phishing via SMS messages.
- **Vishing** – Phishing conducted through phone calls or VoIP systems.
- **Whaling** – Targeted attacks on executives or senior decision-makers.
- **Clone Phishing** – Duplicating a legitimate email but replacing links/attachments with malicious ones.
- **Domain Spoofing** – Forging or imitating a company domain to appear legitimate.
- **Search Engine Phishing (SEO Poisoning)** – Fake websites ranked in search results to capture credentials.
- **Angler Phishing** – Attacks via social media, often impersonating customer support.
- **Malvertising** – Malicious advertisements that distribute malware or redirect to phishing pages.
""")


with st.expander("How to Prevent and Protect Against Phishing (End-User)", expanded=False):
    st.markdown("""
Phishing often targets the human element. Awareness is your strongest defense.

### Best Practices:

- Use strong, unique passwords (consider a password manager)
- Enable Multi-Factor Authentication (MFA)
- Verify sender addresses and inspect URLs carefully
- Only open attachments from trusted and expected sources
- Be cautious of urgent or time-sensitive requests
- Never provide sensitive information via unsolicited email or text
- Report suspicious emails to your IT or security team

### Quick Self-Check Before Clicking:
1. Was I expecting this message?
2. Does the sender’s email address match the official domain?
3. Is the message creating unnecessary urgency?
4. Does the link lead to the correct website?
""")


with st.expander("How to Prevent and Protect Against Phishing (Company Level)", expanded=False):
    st.markdown("""
Organizations cannot eliminate attackers — but they can reduce risk significantly.

### 1) Train Your Employees
Untrained employees are more likely to fall victim.
Regular security awareness training empowers staff to recognize and report phishing attempts.

### 2) Implement Technical Controls
- Email security gateways
- Spam and phishing filters
- Attachment sandboxing
- SPF, DKIM, and DMARC configuration
- Multi-Factor Authentication (MFA)
- Least-Privilege access policies
- Continuous monitoring and alerting

### 3) Establish Clear Processes
- Two-person verification for financial transactions
- Incident response playbooks
- Regular phishing simulations
- Rapid credential reset procedures

Security is a combination of **people, processes, and technology**.
""")

st.write("")

st.markdown(
    "<p style='color:#FF7A00; font-size:0.85rem;'>"
    "<strong>Mailharpoon Tip:</strong> When in doubt — stop, verify, and report."
    "</p>",
    unsafe_allow_html=True
)