import { initializeApp } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/9.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDm_4T2Ipv4CJio1sx1-iXlKbmgr-QqB4I",
  authDomain: "iot-soil-moisture-a01d1.firebaseapp.com",
  projectId: "iot-soil-moisture-a01d1",
  storageBucket: "iot-soil-moisture-a01d1.appspot.com",
  messagingSenderId: "352439726328",
  appId: "1:352439726328:web:9dc4426c2e894b95aa0b0d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById("startButton").onclick = async function () {
  // Get the user's name from the input field
  // const name = document.getElementById("nameInput").value;

  // if (name === "") {
  //   alert("Please enter a name");
  //   return;
  // }

  // Initialize the Google Sign-In provider
  const provider = new GoogleAuthProvider();

  try {
    // Sign in with Google
    const result = await signInWithPopup(auth, provider);

    // Check if the user is authenticated
    if (result.user) {
      // Store the user's name in localStorage
      localStorage.setItem("name", result.user.displayName);

      // Redirect to the chat page
      window.location.href = "./analytics.html";
    } else {
      alert("Authentication failed. Please try again.");
    }
  } catch (error) {
    // Handle authentication errors here
    console.error(error);
  }
};

window.onload = function () {
  // Check if the user is already authenticated
  if (localStorage.getItem("name")) {
    window.location.href = "./analytics.html";
  }
};
