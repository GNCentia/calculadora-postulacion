/* ==========================================================================
   Calculadora de Puntaje de Postulación
   Lógica de validación, cálculo y renderizado de resultados.
   Sin frameworks, sin dependencias externas.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Configuración de carreras: aciertos máximos, pesos y puntaje máximo
   * ------------------------------------------------------------------ */
  const CAREER_CONFIG = {
    tech: {
      label: 'Ingeniería, Ciencias y Tecnología',
      subjects: [
        { key: 'matematica', label: 'Matemática', maxAciertos: 30, maxPuntaje: 400 },
        { key: 'fisica', label: 'Física', maxAciertos: 20, maxPuntaje: 200 },
        { key: 'quimica', label: 'Química', maxAciertos: 20, maxPuntaje: 200 },
        { key: 'lenguaje', label: 'Lenguaje', maxAciertos: 20, maxPuntaje: 200 }
      ]
    },
    admin: {
      label: 'Administración de Empresas',
      subjects: [
        { key: 'matematica', label: 'Matemática', maxAciertos: 30, maxPuntaje: 600 },
        { key: 'lenguaje', label: 'Lenguaje', maxAciertos: 20, maxPuntaje: 400 }
      ]
    }
  };

  const ALL_SUBJECT_KEYS = ['matematica', 'fisica', 'quimica', 'lenguaje'];
  const EXAM_MAX = 1000;

  /* ------------------------------------------------------------------ *
   * Referencias al DOM
   * ------------------------------------------------------------------ */
  const els = {
    careerRadios: document.querySelectorAll('input[name="career"]'),
    fieldsContainer: document.getElementById('fields-aciertos'),
    inputGrado: document.getElementById('input-grado'),
    errorGrado: document.getElementById('error-grado'),
    fieldGrado: document.getElementById('input-grado').closest('.field'),
    btnCalcular: document.getElementById('btn-calcular'),
    btnLimpiar: document.getElementById('btn-limpiar'),
    formError: document.getElementById('form-error'),
    panelResults: document.getElementById('panel-results'),
    gaugeFill: document.getElementById('gauge-fill'),
    resultFinal: document.getElementById('result-final'),
    resultExamen: document.getElementById('result-examen'),
    resultAporteExamen: document.getElementById('result-aporte-examen'),
    resultAporteGrado: document.getElementById('result-aporte-grado'),
    resultGradoRaw: document.getElementById('result-grado-raw'),
    resultGrado1000: document.getElementById('result-grado-1000'),
    examBreakdown: document.getElementById('exam-breakdown'),
    progressItems: document.querySelectorAll('.progress__item')
  };

  const subjectInputs = {};
  ALL_SUBJECT_KEYS.forEach(function (key) {
    subjectInputs[key] = document.getElementById('input-' + key);
  });

  /* ------------------------------------------------------------------ *
   * Utilidades
   * ------------------------------------------------------------------ */

  function getSelectedCareer() {
    for (let i = 0; i < els.careerRadios.length; i++) {
      if (els.careerRadios[i].checked) return els.careerRadios[i].value;
    }
    return 'tech';
  }

  function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function formatNumber(value) {
    return round2(value).toFixed(2);
  }

  function setFieldError(fieldEl, errorEl, message) {
    if (message) {
      fieldEl.classList.add('has-error');
      errorEl.textContent = message;
    } else {
      fieldEl.classList.remove('has-error');
      errorEl.textContent = '';
    }
  }

  /* ------------------------------------------------------------------ *
   * Mostrar / ocultar campos según la carrera seleccionada
   * ------------------------------------------------------------------ */

  function updateVisibleFields() {
    const career = getSelectedCareer();
    const activeKeys = CAREER_CONFIG[career].subjects.map(function (s) { return s.key; });

    ALL_SUBJECT_KEYS.forEach(function (key) {
      const fieldEl = els.fieldsContainer.querySelector('[data-subject="' + key + '"]');
      const isActive = activeKeys.indexOf(key) !== -1;
      fieldEl.classList.toggle('is-hidden', !isActive);
      if (!isActive) {
        // Limpiar valor y errores de campos ocultos para que no interfieran
        subjectInputs[key].value = '';
        setFieldError(fieldEl, document.getElementById('error-' + key), '');
      }
    });
  }

  els.careerRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      updateVisibleFields();
      hideResults();
    });
  });

  /* ------------------------------------------------------------------ *
   * Validación
   * ------------------------------------------------------------------ */

  function validateAciertos(key, maxAciertos) {
    const inputEl = subjectInputs[key];
    const fieldEl = inputEl.closest('.field');
    const errorEl = document.getElementById('error-' + key);
    const raw = inputEl.value.trim();

    if (raw === '') {
      setFieldError(fieldEl, errorEl, 'Ingresa el número de aciertos.');
      return null;
    }

    const num = Number(raw);

    if (!Number.isInteger(num)) {
      setFieldError(fieldEl, errorEl, 'Debe ser un número entero.');
      return null;
    }

    if (num < 0 || num > maxAciertos) {
      setFieldError(fieldEl, errorEl, 'Debe estar entre 0 y ' + maxAciertos + '.');
      return null;
    }

    setFieldError(fieldEl, errorEl, '');
    return num;
  }

  function validateGrado() {
    const raw = els.inputGrado.value.trim();

    if (raw === '') {
      setFieldError(els.fieldGrado, els.errorGrado, 'Ingresa tu nota de grado.');
      return null;
    }

    const num = Number(raw);

    if (Number.isNaN(num)) {
      setFieldError(els.fieldGrado, els.errorGrado, 'Ingresa un número válido.');
      return null;
    }

    if (num < 0 || num > 10) {
      setFieldError(els.fieldGrado, els.errorGrado, 'Debe estar entre 0 y 10.');
      return null;
    }

    setFieldError(els.fieldGrado, els.errorGrado, '');
    return num;
  }

  /* ------------------------------------------------------------------ *
   * Cálculo
   * ------------------------------------------------------------------ */

  function calcular() {
    const career = getSelectedCareer();
    const config = CAREER_CONFIG[career];

    let hasError = false;
    const results = [];
    let examen = 0;

    config.subjects.forEach(function (subject) {
      const aciertos = validateAciertos(subject.key, subject.maxAciertos);
      if (aciertos === null) {
        hasError = true;
        return;
      }
      const puntaje = (aciertos / subject.maxAciertos) * subject.maxPuntaje;
      examen += puntaje;
      results.push({
        label: subject.label,
        aciertos: aciertos,
        maxAciertos: subject.maxAciertos,
        puntaje: puntaje,
        maxPuntaje: subject.maxPuntaje
      });
    });

    const grado = validateGrado();
    if (grado === null) hasError = true;

    if (hasError) {
      els.formError.hidden = false;
      els.formError.textContent = 'Revisa los campos marcados: hay datos inválidos o incompletos.';
      hideResults();
      return;
    }

    els.formError.hidden = true;
    els.formError.textContent = '';

    // Salvaguarda: nunca superar 1000 por errores de precisión de punto flotante
    examen = Math.min(examen, EXAM_MAX);

    const grado1000 = grado * 100;
    const aporteExamen = examen * 0.75;
    const aporteGrado = grado1000 * 0.25;
    let postulacion = aporteExamen + aporteGrado;
    postulacion = Math.min(Math.max(postulacion, 0), 1000);

    renderResults({
      career: career,
      subjects: results,
      examen: examen,
      grado: grado,
      grado1000: grado1000,
      aporteExamen: aporteExamen,
      aporteGrado: aporteGrado,
      postulacion: postulacion
    });
  }

  /* ------------------------------------------------------------------ *
   * Renderizado de resultados
   * ------------------------------------------------------------------ */

  function renderResults(data) {
    // Desglose por materia, con barra de proporción
    els.examBreakdown.innerHTML = '';
    data.subjects.forEach(function (subject) {
      const li = document.createElement('li');

      const nameSpan = document.createElement('span');
      nameSpan.textContent = subject.label;

      const bar = document.createElement('span');
      bar.className = 'bar';
      const barFill = document.createElement('span');
      barFill.className = 'bar__fill';
      const pct = subject.maxPuntaje > 0 ? (subject.puntaje / subject.maxPuntaje) * 100 : 0;
      barFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
      bar.appendChild(barFill);

      const strong = document.createElement('strong');
      strong.textContent = formatNumber(subject.puntaje) + ' / ' + subject.maxPuntaje;

      li.appendChild(nameSpan);
      li.appendChild(bar);
      li.appendChild(strong);
      els.examBreakdown.appendChild(li);
    });

    els.resultExamen.textContent = formatNumber(data.examen) + ' / 1000';
    els.resultAporteExamen.textContent = formatNumber(data.aporteExamen);
    els.resultAporteGrado.textContent = formatNumber(data.aporteGrado);
    els.resultGradoRaw.textContent = formatNumber(data.grado) + ' / 10';
    els.resultGrado1000.textContent = formatNumber(data.grado1000);
    els.resultFinal.textContent = formatNumber(data.postulacion);

    updateGauge(data.postulacion / 1000);
    showResults();
  }

  function updateGauge(fraction) {
    const path = els.gaugeFill;
    const length = path.getTotalLength();
    // Estado inicial: barra vacía
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
    // Forzar reflow para que la transición se aplique al nuevo offset
    // eslint-disable-next-line no-unused-expressions
    path.getBoundingClientRect();
    const offset = length * (1 - Math.max(0, Math.min(1, fraction)));
    requestAnimationFrame(function () {
      path.style.strokeDashoffset = String(offset);
    });
  }

  function showResults() {
    els.panelResults.hidden = false;
    setActiveStep(4, true);
    els.panelResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideResults() {
    els.panelResults.hidden = true;
    setActiveStep(4, false);
  }

  function setActiveStep(stepNumber, done) {
    els.progressItems.forEach(function (item) {
      const step = Number(item.getAttribute('data-step'));
      item.classList.remove('is-active', 'is-done');
      if (step < stepNumber || (step === stepNumber && done)) {
        item.classList.add('is-done');
      } else if (step === stepNumber) {
        item.classList.add('is-active');
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Progreso visual: marcar pasos según el foco del usuario
   * ------------------------------------------------------------------ */

  function markStepFromFocus(stepNumber) {
    if (!els.panelResults.hidden) return; // no tocar el progreso una vez hay resultados
    els.progressItems.forEach(function (item) {
      const step = Number(item.getAttribute('data-step'));
      item.classList.remove('is-active', 'is-done');
      if (step < stepNumber) item.classList.add('is-done');
      else if (step === stepNumber) item.classList.add('is-active');
    });
  }

  document.getElementById('panel-career').addEventListener('focusin', function () { markStepFromFocus(1); });
  els.fieldsContainer.addEventListener('focusin', function () { markStepFromFocus(2); });
  els.inputGrado.addEventListener('focusin', function () { markStepFromFocus(3); });

  /* ------------------------------------------------------------------ *
   * Limpiar formulario
   * ------------------------------------------------------------------ */

  function limpiar() {
    ALL_SUBJECT_KEYS.forEach(function (key) {
      subjectInputs[key].value = '';
      const fieldEl = els.fieldsContainer.querySelector('[data-subject="' + key + '"]');
      setFieldError(fieldEl, document.getElementById('error-' + key), '');
    });
    els.inputGrado.value = '';
    setFieldError(els.fieldGrado, els.errorGrado, '');
    els.formError.hidden = true;
    els.formError.textContent = '';
    hideResults();
    markStepFromFocus(1);
    document.getElementById('career-tech').checked = true;
    updateVisibleFields();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ------------------------------------------------------------------ *
   * Eventos
   * ------------------------------------------------------------------ */

  els.btnCalcular.addEventListener('click', calcular);
  els.btnLimpiar.addEventListener('click', limpiar);

  // Permitir calcular con Enter dentro de cualquier input
  document.querySelectorAll('input[type="number"]').forEach(function (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        calcular();
      }
    });
  });

  /* ------------------------------------------------------------------ *
   * Inicialización
   * ------------------------------------------------------------------ */

  updateVisibleFields();

})();
