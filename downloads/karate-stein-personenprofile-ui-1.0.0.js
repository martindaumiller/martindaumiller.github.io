(() => {
  'use strict';

  const ensureStyles = () => {
    if (document.getElementById('ks-person-profile-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'ks-person-profile-ui-styles';
    style.textContent = `
      .ks-person-profile-note{margin:.85rem 0 1rem;padding:.8rem 1rem;border-left:4px solid #d91e28;border-radius:10px;background:#f8f5f1;color:#3f383b}
      .ks-person-profile-note strong{display:block;margin-bottom:.15rem}
      .ks-person-create{margin:1.1rem 0 1.6rem;border:1px solid #ded5cf;border-radius:14px;background:#fff;overflow:hidden}
      .ks-person-create>summary{cursor:pointer;list-style:none;padding:1rem 1.15rem;font-weight:800;color:#171315;background:#f8f5f1}
      .ks-person-create>summary::-webkit-details-marker{display:none}
      .ks-person-create>summary:after{content:"＋";float:right;color:#d91e28}
      .ks-person-create[open]>summary:after{content:"–"}
      .ks-person-create-body{padding:1rem}
      .ks-person-create .ks-member-form{margin:0}
    `;
    document.head.append(style);
  };

  const setHeading = (form, eyebrow, title, copy) => {
    const head = form.querySelector('.ks-member-form-head');
    if (!head) return;
    head.replaceChildren();
    const eyebrowNode = document.createElement('p');
    eyebrowNode.className = 'eyebrow red';
    eyebrowNode.textContent = eyebrow;
    const titleNode = document.createElement('h2');
    titleNode.textContent = title;
    const copyNode = document.createElement('p');
    copyNode.textContent = copy;
    head.append(eyebrowNode, titleNode, copyNode);
  };

  const relabelRelationship = (form) => {
    const relationship = form.querySelector('[name="relationship"]');
    if (!relationship) return;
    const label = relationship.closest('label');
    if (label && label.firstChild && label.firstChild.nodeType === Node.TEXT_NODE) {
      label.firstChild.textContent = 'Person ';
    }
  };

  const prepareCreationForm = (form, defaultRelationship) => {
    form.removeAttribute('data-member-application');
    form.setAttribute('data-person-create-form', '1');
    form.id = 'person-einmalig-anlegen';

    const existingSelect = form.querySelector('[data-existing-member]');
    if (existingSelect) existingSelect.closest('label')?.remove();

    const fields = form.querySelector('[data-new-member-fields]');
    if (fields) {
      fields.hidden = false;
      fields.removeAttribute('data-new-member-fields');
      fields.querySelectorAll('input, select').forEach((control) => {
        control.disabled = false;
        control.required = ['participant_first_name', 'participant_last_name', 'birth_year'].includes(control.name);
      });
    }

    ['participant_first_name', 'participant_last_name', 'birth_year', 'grade'].forEach((name) => {
      const control = form.querySelector(`[name="${name}"]`);
      if (control) control.value = '';
    });

    const relationship = form.querySelector('[name="relationship"]');
    if (relationship) relationship.value = defaultRelationship;
    relabelRelationship(form);

    const head = form.querySelector('.ks-member-form-head');
    if (head) head.id = 'person-einmalig-anlegen-titel';
    setHeading(
      form,
      'Einmalig anlegen',
      'Neue Person speichern',
      'Lege dich selbst oder ein Kind nur einmal an. Danach reicht bei jeder weiteren Gruppe die Auswahl der gespeicherten Person.'
    );

    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.textContent = 'Person anlegen und zur Gruppe hinzufügen';
  };

  const prepareFirstProfileForm = (form, fields, submit) => {
    setHeading(
      form,
      'Einmalig anlegen',
      'Person einmalig anlegen',
      'Wähle „Ich selbst“ oder „Mein Kind“. Die Angaben werden gespeichert und müssen bei weiteren Gruppen nicht erneut eingegeben werden.'
    );
    if (fields) {
      fields.hidden = false;
      fields.querySelectorAll('input, select').forEach((control) => {
        control.disabled = false;
        control.required = ['participant_first_name', 'participant_last_name', 'birth_year'].includes(control.name);
      });
    }
    relabelRelationship(form);
    if (submit) submit.textContent = 'Person anlegen und zur Gruppe hinzufügen';
  };

  const init = () => {
    ensureStyles();

    document.querySelectorAll('form[data-member-application]').forEach((form) => {
      if (form.dataset.personProfileUi === 'ready') return;
      form.dataset.personProfileUi = 'ready';

      const select = form.querySelector('select[data-existing-member]');
      const fields = form.querySelector('[data-new-member-fields]');
      const submit = form.querySelector('button[type="submit"]');

      if (!select || !fields) {
        prepareFirstProfileForm(form, fields, submit);
        return;
      }

      const savedOptions = Array.from(select.options).filter((option) => option.value !== '');
      if (!savedOptions.length) {
        prepareFirstProfileForm(form, fields, submit);
        return;
      }

      const creationForm = form.cloneNode(true);

      fields.remove();
      const emptyOption = Array.from(select.options).find((option) => option.value === '');
      if (emptyOption) {
        emptyOption.textContent = 'Gespeicherte Person auswählen';
        emptyOption.disabled = true;
      }
      select.required = true;
      if (!select.value && savedOptions.length === 1) select.value = savedOptions[0].value;

      setHeading(
        form,
        'Gruppenzuordnung',
        'Person auswählen und Gruppe hinzufügen',
        'Wähle dich selbst oder ein bereits angelegtes Kind. Die persönlichen Daten bleiben gespeichert und werden nicht erneut abgefragt.'
      );

      const note = document.createElement('div');
      note.className = 'ks-person-profile-note';
      const noteTitle = document.createElement('strong');
      noteTitle.textContent = 'Daten nur einmal eingeben';
      note.append(noteTitle, document.createTextNode('Für weitere Gruppen genügt künftig die Auswahl der gespeicherten Person.'));
      const head = form.querySelector('.ks-member-form-head');
      if (head) head.insertAdjacentElement('afterend', note);
      if (submit) submit.textContent = 'Zur Gruppe hinzufügen';

      prepareCreationForm(creationForm, 'child');

      const details = document.createElement('details');
      details.className = 'ks-person-create';
      const summary = document.createElement('summary');
      summary.textContent = 'Kind oder weitere Person einmalig anlegen';
      const body = document.createElement('div');
      body.className = 'ks-person-create-body';
      body.append(creationForm);
      details.append(summary, body);
      form.insertAdjacentElement('afterend', details);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
