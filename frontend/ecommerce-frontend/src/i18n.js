import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "navbar_home": "Home",
      "navbar_shop": "Shop",
      "navbar_dashboard": "Dashboard",
      "navbar_orders": "My Orders",
      "navbar_track": "Track Order",
      "navbar_wishlist": "Wishlist ❤️",
      "navbar_cart": "Cart",
      "navbar_profile": "Profile",
      "navbar_signout": "Sign Out",
      "navbar_getstarted": "Get Started",
      "brand_name": "ProCart"
    }
  },
  hi: {
    translation: {
      "navbar_home": "होम",
      "navbar_shop": "दुकान",
      "navbar_dashboard": "डैशबोर्ड",
      "navbar_orders": "मेरे ऑर्डर",
      "navbar_track": "ऑर्डर ट्रैक करें",
      "navbar_wishlist": "विशलिस्ट ❤️",
      "navbar_cart": "कार्ट",
      "navbar_profile": "प्रोफ़ाइल",
      "navbar_signout": "लॉग आउट",
      "navbar_getstarted": "शुरू करें",
      "brand_name": "प्रोकार्ट"
    }
  },
  te: {
    translation: {
      "navbar_home": "హోమ్",
      "navbar_shop": "దుకాణం",
      "navbar_dashboard": "డ్యాష్‌బోర్డ్",
      "navbar_orders": "నా ఆర్డర్లు",
      "navbar_track": "ఆర్డర్‌ను ట్రాక్ చేయండి",
      "navbar_wishlist": "విష్‌లిస్ట్ ❤️",
      "navbar_cart": "కార్ట్",
      "navbar_profile": "ప్రొఫైల్",
      "navbar_signout": "సైన్ అవుట్",
      "navbar_getstarted": "ప్రారంభించండి",
      "brand_name": "ప్రోకార్ట్"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en', // Default language if detection fails
    interpolation: {
      escapeValue: false // React already protects from XSS
    }
  });

export default i18n;