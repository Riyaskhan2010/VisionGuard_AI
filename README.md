# VisionGuard AI — Industrial Quality Intelligence Platform

AI-powered defect detection platform using **YOLOv8**, **Flask**, and **React**.

## Quick Start

### Backend (Terminal 1)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```
Server starts at **http://localhost:5000**

### Frontend (Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
App opens at **http://localhost:5173**

---

## Default Accounts

| Role   | Email                       | Password  |
|--------|-----------------------------|-----------|
| Admin  | admin@visionguard.com       | admin123  |
| Worker | worker@visionguard.com      | worker123 |

---

## Features

### Worker Module
- Upload product images
- Run YOLOv8 AI defect detection (crack / scratch / dent)
- View detection results with bounding boxes
- Inspection history with status tracking

### Admin Module
- Review all inspections
- Approve or reject with reason
- Smart alerts (recurring, critical, high reject rate)
- Full analytics dashboard with Chart.js

### AI Engine
- YOLOv8 with OpenCV fallback
- Defect severity mapping (Critical / Medium / Low)
- Bounding box visualization
- Recurring defect memory

---

## Tech Stack

| Layer    | Technology                           |
|----------|--------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS         |
| Backend  | Python Flask, SQLAlchemy, SQLite     |
| AI       | YOLOv8, OpenCV, Pillow               |
| Auth     | JWT (Flask-JWT-Extended)             |
| Charts   | Chart.js + react-chartjs-2           |
