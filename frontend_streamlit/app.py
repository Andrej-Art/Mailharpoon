import base64
from pathlib import Path
import streamlit as st


# Global CSS (modern polish)

st.markdown(
    """
<style>
/* General layout */
.block-container { padding-top: 1.2rem; }

/* Sidebar spacing */
section[data-testid="stSidebar"] > div {
  padding-top: 1rem;
}

/* Modern rounding for inputs/buttons */
div[data-baseweb="select"] > div,
div[data-baseweb="input"] > div,
textarea,
button[kind="primary"],
button[kind="secondary"] {
  border-radius: 14px !important;
}

/* Subtle divider */
hr {
  border: none;
  height: 1px;
  margin: 0.75rem 0;
  background: rgba(255,255,255,0.08);
}

/* Sidebar nav items */
section[data-testid="stSidebar"] a {
  border-radius: 12px !important;
  padding: 0.35rem 0.5rem;
}

/* Active nav item */
section[data-testid="stSidebar"] a[aria-current="page"] {
  background: rgba(255, 138, 0, 0.12) !important;
  border: 1px solid rgba(255, 138, 0, 0.25) !important;
}

/* Small header text in sidebar */
.mh-subtitle {
  opacity: 0.78;
  font-size: 0.85rem;
  margin-top: 0.15rem;
}

/* Optional: tighten group headers in navigation */
section[data-testid="stSidebar"] h2 {
  margin-top: 0.9rem;
}
</style>
""",
    unsafe_allow_html=True,
)


# Paths (avoid absolute paths)

APP_DIR = Path(__file__).resolve().parent
PROJECT_DIR = APP_DIR.parent  

PAGES_DIR = APP_DIR / "pages"
LOGO_PATH = PROJECT_DIR / "images" / "Mailharpoon_image.png"

def img_to_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode()


# Sidebar (centered logo + clean header)

with st.sidebar:
    logo_b64 = img_to_base64(LOGO_PATH)

    st.markdown(
        f"""
        <div style="text-align:center; padding: 0.25rem 0 0.5rem 0;">
          <img src="data:image/png;base64,{logo_b64}" width="240" />
          <div style="margin-top: .35rem; font-weight: 700; letter-spacing: .6px;">
            MAILHARPOON
          </div>
          <div class="mh-subtitle">Phishing Detector & Insights</div>
        </div>
        <hr />
        """,
        unsafe_allow_html=True,
    )


# Pages

main_page = st.Page(
    page=str(PAGES_DIR / "main_page.py"),
    title="URL Analyzer",
    icon=":material/phishing:",
    default=True,
)

phishing_page = st.Page(
    page=str(PAGES_DIR / "phishing_page.py"),
    title="The Mailharpoon Project",
    icon=":material/info:",
)

ml_principles = st.Page(
    page=str(PAGES_DIR / "ml_principles.py"),
    title="Machine Learning Insights",
    icon=":material/analytics:",
)

what_is_phishing = st.Page(
    page=str(PAGES_DIR / "what_is_phishing.py"),
    title="What is Phishing?",
    icon=":material/auto_stories:",
)




# Navigation
pg = st.navigation(
    {
        "Mailharpoon": [main_page],
        "About": [phishing_page, ml_principles, what_is_phishing],
    }
)

pg.run()