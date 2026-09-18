(async () => {
  'use strict';

  const output = document.getElementById('out');
  const setOutput = (message, ok) => {
    if (output) {
      output.textContent = message;
      output.className = ok ? 'ok' : 'err';
    }
    document.title = ok ? 'KS-Aktualisierung erfolgreich' : 'KS-Aktualisierung fehlgeschlagen';
  };

  try {
    const theme = 'karate-stein-wpvibe-draft';
    const editorUrl = '/wp-admin/theme-editor.php?file=inc%2Fmember-registration-multigroup.php&theme=' + encodeURIComponent(theme);
    const response = await fetch(editorUrl, { credentials: 'same-origin' });
    const source = await response.text();

    if (!response.ok) {
      throw new Error('Theme-Editor nicht erreichbar: HTTP ' + response.status);
    }

    const doc = new DOMParser().parseFromString(source, 'text/html');
    const editorForm = doc.querySelector('form#template');
    const textarea = doc.querySelector('textarea#newcontent, textarea[name="newcontent"]');
    const nonceInput = editorForm && editorForm.querySelector('input[name="nonce"]');

    if (!editorForm || !textarea || !nonceInput || !nonceInput.value) {
      throw new Error('Editorformular oder Sicherheitsnachweis wurde nicht gefunden.');
    }

    let code = textarea.value;
    const marker = "add_action('admin_post_ks_member_register', 'ks_theme_multigroup_prepare_registration', 0);";
    const addition = `

/**
 * Existing accounts may freely join every regular group. Only the
 * Leistungsgruppe (ID 65) remains subject to trainer approval.
 */
function ks_theme_multigroup_prepare_existing_application(): void {
    if ('POST' !== strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? ''))) {
        return;
    }

    $group_id = absint(wp_unslash($_POST['group_id'] ?? 0));
    if (
        !$group_id
        || !in_array($group_id, ks_theme_multigroup_registration_groups(), true)
    ) {
        return;
    }

    if (ks_theme_multigroup_requires_approval($group_id)) {
        unset($_POST['group_invitation']);
        return;
    }

    $token = ks_theme_multigroup_auto_approval_token($group_id);
    if ('' !== $token) {
        $_POST['group_invitation'] = $token;
    } else {
        unset($_POST['group_invitation']);
    }
}
add_action('admin_post_ks_member_apply', 'ks_theme_multigroup_prepare_existing_application', 0);`;

    if (!code.includes('ks_theme_multigroup_prepare_existing_application')) {
      if (!code.includes(marker)) {
        throw new Error('Einfügemarke wurde nicht gefunden.');
      }
      code = code.replace(marker, marker + addition);
    }

    code = code.replaceAll(
      'ks_multigroup_admission_policy_v1_backup',
      'ks_multigroup_admission_policy_v2_backup'
    );
    code = code.replaceAll(
      'ks_multigroup_admission_policy_v1',
      'ks_multigroup_admission_policy_v2'
    );

    const form = new URLSearchParams({
      nonce: nonceInput.value,
      action: 'update',
      file: 'inc/member-registration-multigroup.php',
      theme,
      newcontent: code,
      'docs-list': ''
    });

    const save = await fetch('/wp-admin/theme-editor.php', {
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: form.toString()
    });

    const resultText = await save.text();
    if (
      !save.ok
      || (!save.url.includes('a=1') && !resultText.includes('File edited successfully'))
    ) {
      const errorDoc = new DOMParser().parseFromString(resultText, 'text/html');
      const errorNode = errorDoc.querySelector('#message, .notice-error, .error');
      const detail = errorNode ? errorNode.textContent.trim() : resultText.slice(0, 700);
      throw new Error('Speichern fehlgeschlagen: ' + detail);
    }

    setOutput(
      'Erfolgreich gespeichert. Reguläre Gruppen werden nun ohne Trainerfreigabe aktiviert; nur die Leistungsgruppe bleibt freigabepflichtig.',
      true
    );
  } catch (error) {
    setOutput(
      'Fehler: ' + (error && error.message ? error.message : String(error)),
      false
    );
  }
})();