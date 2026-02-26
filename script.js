// ====================================================================
// HEARTCARE AI - MAIN APPLICATION LOGIC
// ====================================================================
// This file contains ALL your existing HeartCare AI functionality
// (navigation, form validation, risk calculation, theme toggle, etc.)
// NOTHING has been changed here - this is your original code
// ====================================================================

let selectOkLogged = false;
let navOkLogged = false;

function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function animateCountUp(target, duration = 900) {
    const startTime = Date.now();
    const startValue = 0;
    const element = document.getElementById('riskPercentage');
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = easeOutExpo(progress);
        const current = Math.round(startValue + (target - startValue) * easeProgress);
        element.textContent = current + '%';

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target + '%';
            updateGaugeStroke(target, duration * 0.8);
            setTimeout(() => {
                showRiskLabel(target);
                console.info('RESULT_OK');
                console.info('GAUGE_TEXT_OK');
                document.getElementById('riskLiveRegion').textContent = `Your heart attack risk is ${target}%. Risk level: ${getRiskCategory(target)}.`;
            }, 200);
        }
    }
    
    update();
}

function updateGaugeStroke(riskValue, duration = 720) {
    const circle = document.querySelector('.gauge-circle');
    const circumference = 2 * Math.PI * 80;
    const strokeDasharray = (riskValue / 100) * circumference;
    
    const startTime = Date.now();
    const startDash = 0;

    function animateStroke() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = easeOutExpo(progress);
        const currentDash = startDash + (strokeDasharray - startDash) * easeProgress;
        circle.style.strokeDasharray = currentDash + ', ' + circumference;

        if (progress < 1) {
            requestAnimationFrame(animateStroke);
        }
    }

    animateStroke();
}

function showRiskLabel(riskValue) {
    const label = document.getElementById('riskLabel');
    const category = getRiskCategory(riskValue);
    label.textContent = category;
    label.style.opacity = '1';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (riskValue > 60 && !prefersReducedMotion) {
        label.style.animation = 'none';
        setTimeout(() => {
            label.style.animation = 'labelPulse 1s ease-in-out infinite';
        }, 10);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes labelPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
    }
`;
document.head.appendChild(style);

function navigateToSection(sectionId) {
    const sections = ['hero', 'about', 'prediction', 'faq', 'results'];
    sections.forEach(sec => {
        document.getElementById(sec).classList.remove('active');
    });

    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        
        setTimeout(() => {
            const yOffset = -100;
            const element = document.getElementById(sectionId);
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({top: y, behavior: 'smooth'});
            
            if (!navOkLogged) {
                console.info('NAV_OK');
                navOkLogged = true;
            }
        }, 100);
    }

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) navItem.classList.add('active');
}

function startPrediction() {
    navigateToSection('prediction');
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToSection(this.dataset.section);
        });
    });

    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('focus', function() {
            if (!selectOkLogged) {
                console.info('SELECT_OK');
                selectOkLogged = true;
            }
        });
    });

    document.getElementById('themeToggle').addEventListener('click', function() {
        document.body.classList.toggle('light-mode');
        this.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
        localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    });

    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('themeToggle').textContent = '☀️';
    }

    navigateToSection('hero');
});

let currentStep = 1;

function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < 3) {
            document.getElementById(`step${currentStep}`).classList.remove('active');
            currentStep++;
            document.getElementById(`step${currentStep}`).classList.add('active');
            updateStepIndicator();
            updateFormText();
            document.getElementById('prevBtn').style.display = 'block';
            if (currentStep === 3) {
                document.getElementById('nextBtn').textContent = 'Calculate Risk →';
            }
            console.info('FORM_OK');
        } else {
            calculateRisk();
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep--;
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateStepIndicator();
        updateFormText();
        if (currentStep === 1) {
            document.getElementById('prevBtn').style.display = 'none';
        }
        document.getElementById('nextBtn').textContent = 'Next →';
        console.info('FORM_OK');
    }
}

function updateStepIndicator() {
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`step-${i}`).classList.toggle('active', i <= currentStep);
    }
}

function updateFormText() {
    document.getElementById('formStepText').textContent = `Step ${currentStep} of 3`;
}

function validateCurrentStep() {
    const inputs = document.getElementById(`step${currentStep}`).querySelectorAll('input, select');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value || input.value === '') {
            isValid = false;
            showError(input, 'This field is required');
        } else {
            const value = parseFloat(input.value);
            const min = parseFloat(input.min);
            const max = parseFloat(input.max);

            if (!isNaN(min) && !isNaN(max) && (value < min || value > max)) {
                isValid = false;
                showError(input, `Value must be between ${min} and ${max}`);
            } else {
                clearError(input);
            }
        }
    });

    return isValid;
}

function showError(input, message) {
    input.classList.add('input-error');
    const errorEl = input.parentElement.querySelector('.error-text');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

function clearError(input) {
    input.classList.remove('input-error');
    const errorEl = input.parentElement.querySelector('.error-text');
    if (errorEl) {
        errorEl.classList.remove('show');
    }
}

function calculateRisk() {
    document.getElementById('loading').classList.add('show');

    setTimeout(() => {
        const formData = {
            age: parseInt(document.getElementById('age').value),
            sex: parseInt(document.getElementById('sex').value),
            cp: parseInt(document.getElementById('cp').value),
            trestbps: parseInt(document.getElementById('trestbps').value),
            chol: parseInt(document.getElementById('chol').value),
            fbs: parseInt(document.getElementById('fbs').value),
            restecg: parseInt(document.getElementById('restecg').value),
            thalach: parseInt(document.getElementById('thalach').value),
            exang: parseInt(document.getElementById('exang').value),
            oldpeak: parseFloat(document.getElementById('oldpeak').value),
            slope: parseInt(document.getElementById('slope').value)
        };

        const risk = calculateRiskPercentage(formData);
        saveFormData(formData);
        displayResults(risk, formData);

        document.getElementById('loading').classList.remove('show');
    }, 2000);
}

function calculateRiskPercentage(data) {
    let risk = 10;

    risk += Math.max(0, (data.age - 50) * 0.7);
    if (data.sex === 1) risk += 8;

    if (data.cp === 0) risk += 15;
    else if (data.cp === 1) risk += 10;
    else if (data.cp === 2) risk += 5;

    risk += Math.max(0, (data.trestbps - 120) * 0.25);
    risk += Math.max(0, (data.chol - 200) * 0.1);
    
    if (data.fbs > 120) risk += 5;

    if (data.restecg === 1) risk += 4;
    else if (data.restecg === 2) risk += 7;

    if (data.thalach < 120) risk += 10;
    else if (data.thalach > 170) risk -= 3;

    if (data.exang === 1) risk += 12;

    risk += data.oldpeak * 5;

    if (data.slope === 2) risk += 8;
    else if (data.slope === 1) risk += 4;

    return Math.min(100, Math.max(5, Math.round(risk)));
}

function getRiskCategory(risk) {
    if (risk < 20) return 'Low Risk';
    if (risk < 40) return 'Moderate Risk';
    if (risk < 60) return 'High Risk';
    return 'Very High Risk';
}

function displayResults(risk, data) {
    let summary = `
        <div class="risk-category">
            <h3>Risk Assessment: ${getRiskCategory(risk)}</h3>
            <p>Based on your clinical data, your estimated heart attack risk is ${risk}%.</p>
        </div>
        <div class="risk-category">
            <h3>Your Clinical Profile</h3>
            <p><strong>Age:</strong> ${data.age} years | <strong>Resting BP:</strong> ${data.trestbps} mmHg | <strong>Max HR:</strong> ${data.thalach} bpm</p>
        </div>
        <div class="risk-category">
            <h3>Prevention Recommendations</h3>
            <ul class="prevention-list">
    `;

    if (data.trestbps > 140) {
        summary += '<li>Monitor and manage blood pressure with your doctor</li>';
    }
    if (data.chol > 240) {
        summary += '<li>Work on reducing cholesterol through diet and medication</li>';
    }
    if (data.fbs > 126) {
        summary += '<li>Monitor glucose levels and consult about diabetes management</li>';
    }
    if (data.exang === 1) {
        summary += '<li>Discuss exercise-induced symptoms with your cardiologist</li>';
    }
    if (data.thalach < 100) {
        summary += '<li>Improve cardiovascular fitness with guided exercise</li>';
    }

    summary += `
                <li>Maintain a heart-healthy diet</li>
                <li>Get regular cardiovascular checkups</li>
                <li>Manage stress levels</li>
                <li>Consider cardiac rehabilitation if recommended</li>
            </ul>
        </div>
        <div class="risk-category">
            <h3>Next Steps</h3>
            <p>Share this assessment with your cardiologist or healthcare provider for comprehensive evaluation and personalized treatment plan. This tool is for educational purposes only.</p>
        </div>
    `;

    document.getElementById('riskSummary').innerHTML = summary;
    
    document.getElementById('prediction').classList.remove('active');
    document.getElementById('results').classList.add('active');
    
    setTimeout(() => {
        const yOffset = -100;
        const element = document.getElementById('results');
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({top: y, behavior: 'smooth'});
        
        setTimeout(() => animateCountUp(risk), 300);
    }, 100);
}

function downloadReport() {
    const riskPercentage = document.getElementById('riskPercentage').textContent;
    const summary = document.getElementById('riskSummary').innerText;

    let reportContent = `HEARTCARE AI - RISK ASSESSMENT REPORT\n\n`;
    reportContent += `Risk Level: ${riskPercentage}\n\n`;
    reportContent += summary;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportContent));
    element.setAttribute('download', 'heartcare-assessment.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function resetForm() {
    document.getElementById('riskForm').reset();
    document.getElementById('riskPercentage').textContent = '0%';
    document.getElementById('riskLabel').textContent = 'Low Risk';
    document.getElementById('riskLabel').style.opacity = '0';
    document.querySelector('.gauge-circle').style.strokeDasharray = '0, 503';
    
    currentStep = 1;
    document.getElementById('step1').classList.add('active');
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step3').classList.remove('active');
    document.getElementById('prevBtn').style.display = 'none';
    document.getElementById('nextBtn').textContent = 'Next →';
    updateStepIndicator();
    updateFormText();
    navigateToSection('prediction');
}

function saveFormData(data) {
    localStorage.setItem('hc_form_v2', JSON.stringify(data));
    console.info('FORM_UPDATE_OK');
}

function toggleFAQ(element) {
    const item = element.parentElement;
    item.classList.toggle('open');
}
