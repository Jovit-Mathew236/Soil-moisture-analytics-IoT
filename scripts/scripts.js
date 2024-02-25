import { initializeApp } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-app.js";
import {
  onSnapshot,
  getFirestore,
  setDoc,
  collection,
  query,
  doc,
} from "https://www.gstatic.com/firebasejs/9.12.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDm_4T2Ipv4CJio1sx1-iXlKbmgr-QqB4I",
  authDomain: "iot-soil-moisture-a01d1.firebaseapp.com",
  projectId: "iot-soil-moisture-a01d1",
  storageBucket: "iot-soil-moisture-a01d1.appspot.com",
  messagingSenderId: "352439726328",
  appId: "1:352439726328:web:9dc4426c2e894b95aa0b0d",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

var chart = new Highcharts.Chart({
  chart: {
    renderTo: "chart-container",
    type: "column",
  },
  title: {
    text: "Soil Moisture and LED Count",
  },
  xAxis: {
    type: "category",
    title: {
      text: "Month and Year",
    },
  },
  yAxis: [
    {
      title: {
        text: "Average Moisture",
      },
    },
    {
      title: {
        text: "LED Count",
      },
      opposite: true,
    },
  ],
  series: [
    {
      name: "Soil Moisture",
      color: "#059e8a",
      data: [],
    },
    {
      name: "LED Count",
      color: "#FF0000",
      data: [],
      yAxis: 1,
    },
  ],
  credits: {
    enabled: false,
  },
});

function calculateAverage(array) {
  var sum = 0;
  var count = 0;
  for (var i = 0; i < array.length; i++) {
    sum += array[i];
    count++;
  }
  if (count === 0) return 0;
  return sum / count;
}

async function requestData() {
  const user = localStorage.getItem("name");

  if (!user) {
    window.location.href = "./"; // Redirect to the home page if no user is authenticated
    return;
  }
  onSnapshot(query(collection(db, "data")), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log("Data changed: ", change.doc.data());
      if (change.type === "added") {
        console.log("New data: ", change.doc.data());
        updateChart(change.doc.data());
      }
      if (change.type === "modified") {
        console.log("Modified data: ", change.doc.data());
        updateChart(change.doc.data());
      }
      if (change.type === "removed") {
        console.log("Removed data: ", change.doc.data());
        updateChart(change.doc.data());
      }
    });
  });

  try {
    const response = await fetch(
      "http://192.168.1.6/soilmoisture_ledcount_data"
    );
    const data = await response.json();
    if (data && data.moistureData && data.ledCountData) {
      // Update moisture data in Firestore
      await updateDataInFirestore("data", data);
    } else {
      console.error("Received invalid data:", data);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

async function updateDataInFirestore(collectionName, dataArray) {
  try {
    const docRef = doc(db, collectionName, "docid");
    await setDoc(docRef, dataArray); // Set the entire document with the new data
    console.log("Document updated successfully");
  } catch (error) {
    console.error("Error updating document: ", error);
  }
}

function updateChart(data) {
  const moistureData = data.moistureData;
  const ledCountData = data.ledCountData;

  // Clear existing series data
  chart.series[0].setData([], false);
  chart.series[1].setData([], false);

  // Add moisture data to chart
  moistureData.forEach(function (moistureItem) {
    var averageMoisture = calculateAverage(moistureItem.data);
    chart.series[0].addPoint({
      name: moistureItem.name,
      y: averageMoisture,
    });
  });

  // Add LED count data to chart
  ledCountData.forEach(function (ledItem) {
    chart.series[1].addPoint({
      name: ledItem.name,
      y: ledItem.y,
    });
  });

  // Redraw the chart
  chart.redraw();
}

setInterval(requestData, 5000); // Request data every 5 seconds

window.onload = requestData;

const logoutbtn = document.getElementById("logoutButton");

logoutbtn.onclick = function () {
  localStorage.removeItem("name");
  auth.signOut();
  window.location.href = "./";
};
