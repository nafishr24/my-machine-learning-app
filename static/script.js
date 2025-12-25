// Inisialisasi nilai slider
document.addEventListener("DOMContentLoaded", function () {
  // Update nilai slider saat berubah
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach((slider) => {
    const valueSpan = document.getElementById(`${slider.id}-value`);
    if (valueSpan) {
      valueSpan.textContent = slider.value;
    }

    slider.addEventListener("input", function () {
      const valueSpan = document.getElementById(`${this.id}-value`);
      if (valueSpan) {
        valueSpan.textContent = this.value;
      }
    });
  });

  // Reset form
  document.getElementById("reset-btn").addEventListener("click", function () {
    document.getElementById("prediction-form").reset();

    // Reset slider values display
    document.getElementById("fcvc-value").textContent = "2";
    document.getElementById("ch2o-value").textContent = "2";
    document.getElementById("faf-value").textContent = "1";
    document.getElementById("tue-value").textContent = "2";

    // Reset hasil prediksi
    document.getElementById("prediction-text").textContent =
      'Masukkan data dan klik "Prediksi Obesitas"';
    document.getElementById("prediction-detail").textContent =
      "Hasil prediksi akan muncul di sini";
    document.getElementById("confidence-badge").textContent = "0%";

    // Reset chart
    const chartContainer = document.getElementById("probability-chart");
    chartContainer.innerHTML = `
            <div class="chart-placeholder">
                <p>Grafik probabilitas akan muncul setelah prediksi</p>
            </div>
        `;
  });

  // Handle form submission
  document
    .getElementById("prediction-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      predictObesity();
    });
});

// Fungsi untuk prediksi
async function predictObesity() {
  // Kumpulkan data dari form
  const formData = new FormData(document.getElementById("prediction-form"));
  const data = Object.fromEntries(formData.entries());

  // Konversi nilai slider ke angka
  data.fcvc = parseFloat(data.fcvc);
  data.ch2o = parseFloat(data.ch2o);
  data.faf = parseFloat(data.faf);
  data.tue = parseFloat(data.tue);
  data.age = parseFloat(data.age);
  data.height = parseFloat(data.height);
  data.weight = parseFloat(data.weight);
  data.ncp = parseFloat(data.ncp);

  // Tampilkan loading state
  document.getElementById("prediction-text").textContent = "Memproses...";
  document.getElementById("prediction-detail").textContent =
    "Sedang menganalisis data Anda";
  document.getElementById("confidence-badge").textContent = "...";

  // Kirim request ke server
  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    // Jika ada error
    if (result.error) {
      document.getElementById("prediction-text").textContent =
        "Terjadi Kesalahan";
      document.getElementById("prediction-detail").textContent = result.error;
      document.getElementById("confidence-badge").textContent = "0%";
      return;
    }

    // Tampilkan hasil prediksi
    document.getElementById("prediction-text").textContent = result.prediction;
    document.getElementById(
      "prediction-detail"
    ).textContent = `Anda ${result.confidence}% memiliki kondisi: ${result.prediction}`;
    document.getElementById(
      "confidence-badge"
    ).textContent = `${result.confidence}%`;

    // Tampilkan grafik probabilitas
    displayProbabilityChart(result.all_probabilities);
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("prediction-text").textContent = "Koneksi Error";
    document.getElementById("prediction-detail").textContent =
      "Gagal terhubung ke server. Periksa koneksi Anda.";
    document.getElementById("confidence-badge").textContent = "0%";
  }
}

// Fungsi untuk menampilkan chart probabilitas
function displayProbabilityChart(probabilities) {
  const chartContainer = document.getElementById("probability-chart");
  chartContainer.innerHTML = "";

  // Urutan kategori
  const categories = [
    "Insufficient Weight",
    "Normal Weight",
    "Overweight Level I",
    "Overweight Level II",
    "Obesity Type I",
    "Obesity Type II",
    "Obesity Type III",
  ];

  // Warna untuk setiap kategori
  const categoryColors = {
    "Insufficient Weight": "#3498db",
    "Normal Weight": "#2ecc71",
    "Overweight Level I": "#f1c40f",
    "Overweight Level II": "#e67e22",
    "Obesity Type I": "#e74c3c",
    "Obesity Type II": "#c0392b",
    "Obesity Type III": "#7d3c98",
  };

  // Buat bar untuk setiap kategori
  categories.forEach((category) => {
    const probability = probabilities[category] || 0;

    const barElement = document.createElement("div");
    barElement.className = "chart-bar";

    barElement.innerHTML = `
            <div class="chart-label">${category}</div>
            <div class="chart-bar-inner">
                <div class="chart-fill" style="width: ${probability}%; background-color: ${categoryColors[category]};">
                    <span class="chart-value">${probability}%</span>
                </div>
            </div>
        `;

    chartContainer.appendChild(barElement);

    // Animasi untuk mengisi bar
    setTimeout(() => {
      const fillElement = barElement.querySelector(".chart-fill");
      fillElement.style.width = `${probability}%`;
    }, 100);
  });
}

// Fungsi untuk menghitung BMI (tambahan)
function calculateBMI() {
  const height = parseFloat(document.getElementById("height").value);
  const weight = parseFloat(document.getElementById("weight").value);

  if (height && weight && height > 0) {
    const bmi = weight / (height * height);
    return bmi.toFixed(1);
  }
  return null;
}

// Update BMI ketika tinggi atau berat berubah
document.getElementById("height").addEventListener("input", updateBMIInfo);
document.getElementById("weight").addEventListener("input", updateBMIInfo);

function updateBMIInfo() {
  const bmi = calculateBMI();
  const bmiInfo = document.getElementById("prediction-detail");

  if (bmi) {
    // Hanya update jika belum ada hasil prediksi
    if (bmiInfo.textContent.includes("Hasil prediksi akan muncul")) {
      let bmiCategory = "";
      if (bmi < 18.5) bmiCategory = "Berat badan kurang";
      else if (bmi < 25) bmiCategory = "Berat badan normal";
      else if (bmi < 30) bmiCategory = "Kelebihan berat badan";
      else bmiCategory = "Obesitas";

      bmiInfo.textContent = `BMI: ${bmi} (${bmiCategory}) - Silakan klik "Prediksi Obesitas" untuk analisis lebih detail`;
    }
  }
}
