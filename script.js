
"use strict";

// ======================================
// CivicFix AI - Complaint Management
// ======================================

const form = document.getElementById("complaintForm");
const descriptionInput = document.getElementById("description");
const locationInput = document.getElementById("location");
const complaintList = document.getElementById("complaintList");
const message = document.getElementById("message");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

const totalComplaints = document.getElementById("totalComplaints");
const submittedCount = document.getElementById("submittedCount");
const progressCount = document.getElementById("progressCount");
const resolvedCount = document.getElementById("resolvedCount");

const STORAGE_KEY = "civicfixComplaints";

let complaints = [];

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  complaints = Array.isArray(saved) ? saved : [];
} catch (error) {
  complaints = [];
}

// --------------------------------------
// Save complaints in browser
// --------------------------------------

function saveComplaints() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
    return true;
  } catch (error) {
    showMessage(
      "Could not save data. Browser storage may be full.",
      true
    );
    return false;
  }
}

// --------------------------------------
// Show feedback
// --------------------------------------

function showMessage(text, isError = false) {
  if (!message) return;

  message.textContent = text;
  message.style.color = isError ? "#c62828" : "#087f5b";
}

// --------------------------------------
// Rule-based complaint analysis
// --------------------------------------

function analyzeComplaint(description) {
  const text = description.toLowerCase();

  let category = "Other";
  let priority = "Low";

  if (
    /fire|accident|ambulance|emergency|electric shock|danger/.test(text)
  ) {
    category = "Emergency";
    priority = "High";
  } else if (
    /water|leak|pipe|drainage|sewage|tap/.test(text)
  ) {
    category = "Water";
  } else if (
    /street ?light|streetlight|electricity|power cut|dark road/.test(text)
  ) {
    category = "Streetlight";
  } else if (
    /garbage|waste|rubbish|dustbin|dirty|litter/.test(text)
  ) {
    category = "Garbage";
  } else if (
    /road|pothole|traffic|footpath|pavement/.test(text)
  ) {
    category = "Road";
  }

  if (
    /urgent|overflow|burst pipe|electric shock|fire|accident|danger|emergency/.test(text)
  ) {
    priority = "High";
  } else if (
    /broken|not working|leak|blocked|damaged|dirty|pothole/.test(text)
  ) {
    priority = "Medium";
  }

  return { category, priority };
}

// --------------------------------------
// Update dashboard counters
// --------------------------------------

function updateDashboard() {
  const total = complaints.length;

  const submitted = complaints.filter(
    item => (item.status || "Submitted") === "Submitted"
  ).length;

  const inProgress = complaints.filter(
    item => item.status === "In Progress"
  ).length;

  const resolved = complaints.filter(
    item => item.status === "Resolved"
  ).length;

  if (totalComplaints) totalComplaints.textContent = total;
  if (submittedCount) submittedCount.textContent = submitted;
  if (progressCount) progressCount.textContent = inProgress;
  if (resolvedCount) resolvedCount.textContent = resolved;
}

// --------------------------------------
// Render complaint cards safely
// --------------------------------------

function renderComplaints() {
  if (!complaintList) return;

  const searchTerm = (searchInput?.value || "")
    .toLowerCase()
    .trim();

  const selectedCategory = categoryFilter?.value || "All";

  const filtered = complaints.filter(item => {
    const description = item.description || "";
    const location = item.location || "";
    const category = item.category || "Other";
    const id = item.id || "";

    const searchableText =
      `${description} ${location} ${category} ${id}`.toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    const matchesCategory =
      selectedCategory === "All" ||
      category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  complaintList.replaceChildren();

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = complaints.length
      ? "No matching complaints found."
      : "No complaints yet. Report your first civic issue.";

    complaintList.appendChild(empty);
    updateDashboard();
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "complaint-card";

    const heading = document.createElement("h3");
    heading.textContent = item.category || "Other";

    const id = document.createElement("p");
    id.textContent = "Complaint ID: " + item.id;

    const location = document.createElement("p");
    location.textContent = "Location: " + item.location;

    const description = document.createElement("p");
    description.textContent = item.description;

    const priority = document.createElement("p");
    priority.textContent = "Suggested priority: " + item.priority;

    const statusLabel = document.createElement("label");
    statusLabel.textContent = "Status: ";

    const statusSelect = document.createElement("select");
    statusSelect.setAttribute("aria-label", "Update complaint status");

    ["Submitted", "In Progress", "Resolved"].forEach(status => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      statusSelect.appendChild(option);
    });

    statusSelect.value = [
      "Submitted",
      "In Progress",
      "Resolved"
    ].includes(item.status) ? item.status : "Submitted";

    statusSelect.addEventListener("change", () => {
      const oldStatus = item.status;
      item.status = statusSelect.value;

      if (!saveComplaints()) {
        item.status = oldStatus;
        statusSelect.value = oldStatus || "Submitted";
        return;
      }

      updateDashboard();
      showMessage("Complaint status updated successfully.");
    });

    statusLabel.appendChild(statusSelect);

    card.append(
      heading,
      id,
      location,
      description,
      priority,
      statusLabel
    );

    complaintList.appendChild(card);
  });

  updateDashboard();
}

// --------------------------------------
// Submit new complaint
// --------------------------------------

if (form) {
  form.addEventListener("submit", event => {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const location = locationInput.value.trim();

    if (!description) {
      showMessage("Please describe the problem first.", true);
      descriptionInput.focus();
      return;
    }

    if (!location) {
      showMessage("Please enter the problem location.", true);
      locationInput.focus();
      return;
    }

    // Check for an identical complaint at the same location
    const duplicate = complaints.some(item =>
      (item.description || "").trim().toLowerCase() ===
        description.toLowerCase() &&
      (item.location || "").trim().toLowerCase() ===
        location.toLowerCase()
    );

    if (duplicate) {
      showMessage(
        "This complaint already exists at this location.",
        true
      );
      return;
    }

    const analysis = analyzeComplaint(description);

    const newComplaint = {
      id: "CF-" + Date.now().toString(36).toUpperCase(),
      description,
      location,
      category: analysis.category,
      priority: analysis.priority,
      status: "Submitted",
      createdAt: new Date().toISOString()
    };

    complaints.unshift(newComplaint);

    if (!saveComplaints()) {
      complaints.shift();
      return;
    }

    form.reset();

    if (searchInput) searchInput.value = "";
    if (categoryFilter) categoryFilter.value = "All";

    renderComplaints();

    showMessage(
      `Complaint submitted! Category: ${newComplaint.category}. Suggested priority: ${newComplaint.priority}.`
    );
  });
}

// --------------------------------------
// Search and category filtering
// --------------------------------------

if (searchInput) {
  searchInput.addEventListener("input", renderComplaints);
}

if (categoryFilter) {
  categoryFilter.addEventListener("change", renderComplaints);
}

// --------------------------------------
// Initial page load
// --------------------------------------

renderComplaints();
