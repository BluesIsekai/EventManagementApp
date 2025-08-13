# Ganesh Chaturthi App

Simple React + Vite app to track payments/donations and inventory for the festival.

## Setup

1) Create a Firebase project and enable Firestore.
2) Create a web app in Firebase and copy the config. Create a `.env` file in the project root:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

3) Start the dev server.

## UPI / GPay

This app generates a UPI deep link like `upi://pay?...`. When opened on a phone with GPay/PhonePe/BHIM installed, the app opens and pre-fills details. After payment, you must mark it as received. For auto-confirmation you need a PSP/gateway that provides payment callbacks (webhooks) which can update Firestore from a backend.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
