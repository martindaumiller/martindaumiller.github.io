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
    const editorUrl = '/wp-admin/theme-editor.php?file=inc%2Fmember-registration-multigroup.php&theme=karate-stein';
    const response = await fetch(editorUrl, { credentials: 'same-origin' });
    const source = await response.text();

    if (!response.ok) {
      throw new Error('Theme-Editor nicht erreichbar: HTTP ' + response.status);
    }

    const doc = new DOMParser().parseFromString(source, 'text/html');
    const textarea = doc.querySelector('textarea#newcontent, textarea[name="newcontent"]');
    if (!textarea) {
      throw new Error('Quelltextfeld wurde nicht gefunden.');
    }

    const configMatch = source.match(/var\s+file_editor\s*=\s*(\{[\s\S]*?\});/);
    if (!configMatch) {
      throw new Error('Sicherheitskonfiguration des Editors wurde nicht gefunden.');
    }
    const config = JSON.parse(configMatch[1]);

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
      action: 'edit-theme-plugin-file',
      file: 'inc/member-registration-multigroup.php',
      theme: 'karate-stein',
      plugin: '',
      nonce: config.nonce,
      newcontent: code,
      'docs-list': ''
    });

    const save = await fetch(config.ajaxURL || '/wp-admin/admin-ajax.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: form.toString()
    });

    const resultText = await save.text();
    let result = null;
    try {
      result = JSON.parse(resultText);
    } catch (error) {
      // The raw response is surfaced below.
    }

    if (!save.ok || !result || !result.success) {
      throw new Error('Speichern fehlgeschlagen: ' + resultText.slice(0, 1000));
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