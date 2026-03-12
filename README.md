# Unlocking Open Access 
**Franziska Frank** | Master Thesis | Code

## Purpose of This Repository

This repository contains the Django-based web application developed as a technical component of the accompanying Master’s thesis.

The system serves as a functional prototype to illustrate how licensing guidance and open access data can be presented in an interactive web-based environment.

## Technical Overview

The project is implemented using the Django web framework and follows a modular architecture separating:

- Core project configuration
- API integration logic
- Frontend data story presentation

The application is not intended for production deployment but as a research prototype supporting the thesis.

## Project Structure

```
mysite/
├── manage.py
├── requirements.txt
├── README.md
├── .gitignore
│
├── mysite/                 # Django project configuration
│   ├── asgi.py
│   ├── celery.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
│
├── api-integration/        # API communication & backend logic
│   ├── scripts/
│   │   ├── bison
│   │   ├── openalex
│   │   ├── opf
│   │   ├── xlsx_loader (static data loader)
│   │   ├── crossref (unused)
│   │   └── univis (unused)
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── urls.py
│   ├── utils.py
│   └── views.py
│
├── story/                  # Templates, static files & UI components
│   ├── templates/story/
│   │   ├── base.html
│   │   ├── story_page.html
│   │   └── components/
│   │       ├── open-access-quiz
│   │       ├── person_dropdown
│   │       ├── legend_panel
│   │       ├── licences
│   │       ├── where_publish
│   │       └── bison
│   ├── static/story/
│   │   ├── css/
│   │   ├── js/
│   │   ├── cc-icons-svg/
│   │   └── 10_reasons_OA.png
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── urls.py
│   └── views.py
│
└── media/                  # FIS data (e.g., fis-personen)
```

## Architectural Components
### 1. Core Django Project (mysite/mysite)

Contains global configuration:
- settings.py – Project configuration
- urls.py – Global routing
- asgi.py / wsgi.py – Deployment interfaces
- celery.py – Prepared configuration for asynchronous tasks (not actively used in the current prototype)

The inclusion of Celery demonstrates architectural planning for future scalability.

### 2. App: api-integration

Purpose: Backend data acquisition and processing.

Responsibilities:
- API communication
- Data preprocessing
- Utility functions
- Structured views for frontend usage

Scripts folder includes:
- API script for Bison
- API script for OpenAlex
- API script for OPF
- Static Excel loader (xlsx_loader)
- Unused but prepared scripts for Crossref and Univis

models.py exists but is not actively used; the application primarily operates as a service layer rather than a database-driven system.

### 3. App: story

Purpose: Presentation layer and data story implementation.

Templates:
- story_page.html (main entry point)
- base.html (layout template)

Modular components:
- Open Access quiz
- Person dropdown
- License decision tree
- “Where to publish” section
- Bison integration

Static folder includes:
- CSS for Open Access charts
- JavaScript for navigation and chart logic
- SVG license icons
- Image assets (e.g., Reasons-for-OA graphic)

This separation ensures a clean distinction between data logic and presentation logic.

### 4. Media Folder

The /media directory contains external research-related data, including FIS datasets (e.g., fis-personen).
These files are used for prototype data integration and are not optimized for production-scale processing.


## Installation & Setup
### 1. Clone the repository
```bash
        git clone <repository-url>
        cd MA-thesis-code
        cd mysite
```
### 2. Create virtual environment
```bash
        python -m venv venv
        source venv/bin/activate   # macOS/Linux
        venv\Scripts\activate      # Windows
```
### 3. Install dependencies
```bash
        pip install -r requirements.txt
```
### 4. Add files
Place the provided *.env* file in the root directory (/mysite).<br>  
Place the provided *fis_personen.xlsx* file in the media folder (/mysite/media).
### 5. Apply migrations
```bash
        python manage.py migrate
```
### 6. Run development server
```bash
        python manage.py runserver
```
Open:
```bash
        http://127.0.0.1:8000/
```

