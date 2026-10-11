import { useMemo, useState } from 'react';
import { Crosshair, Save } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { Drawer, Field, Notice, messageErreur, useToast } from '../components/ui';
import { useReferentiels, useResponsables, useTerritoires } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { normaliserNumeroCni, normaliserTelephone } from '@shared/referentiel.js';
import { tel } from '../lib/format';

type Form = Record<string, any>;
const vide: Form = {
  nom: '', prenoms: '', sexe: '', date_naissance: '', numero_cni: '', telephone: '', telephone2: '', email: '', adresse: '', repere: '',
  commune_id: '', quartier_id: '', secteur_id: '', latitude: '', longitude: '',
  coordonnateur_id: '', superviseur_id: '', commissaire_id: '', source: 'TERRAIN', observations: '', information_personne: false,
};

/** Création / modification d'une fiche militant (CDC §5.1, §6.1). */
export function FormulaireMilitant({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: (id: string) => void }) {
  const edition = !!initial?.id;
  const toast = useToast();
  const { can } = useAuth();
  const { data: terr } = useTerritoires();
  const { data: ref } = useReferentiels();
  const { data: resp } = useResponsables(can('dashboard'));
  const [f, setF] = useState<Form>(() => {
    const base = { ...vide };
    if (edition) for (const k of Object.keys(vide)) base[k] = initial[k] ?? (typeof vide[k] === 'boolean' ? false : '');
    if (edition) for (const k of ['telephone', 'telephone2']) if (base[k]) base[k] = tel(base[k]);
    if (!edition && terr?.length === 1) base.commune_id = terr[0].id;
    return base;
  });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [doublons, setDoublons] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [avert, setAvert] = useState<string[]>([]);

  const set = (k: string, v: any) => setF((o) => {
    const n = { ...o, [k]: v };
    if (k === 'commune_id') { n.quartier_id = ''; n.secteur_id = ''; }
    if (k === 'quartier_id') { n.secteur_id = ''; n.commissaire_id = ''; n.superviseur_id = ''; n.coordonnateur_id = ''; }
    return n;
  });
  const commune = terr?.find((c) => c.id === Number(f.commune_id));
  const quartier = commune?.quartiers.find((q) => q.id === Number(f.quartier_id));
  const respQuartier = useMemo(() => (resp || []).filter((r) => r.perimetres.some((p) =>
    (r.fonction === 'COORDONNATEUR' && p.commune_id === Number(f.commune_id)) || p.quartier_id === Number(f.quartier_id))), [resp, f.commune_id, f.quartier_id]);

  function valider(): boolean {
    const e: Record<string, string> = {};
    if (!f.nom.trim()) e.nom = 'Nom obligatoire';
    if (!f.prenoms.trim()) e.prenoms = 'Prénom(s) obligatoire(s)';
    if (!f.sexe) e.sexe = 'Sexe obligatoire';
    if (!f.quartier_id) e.quartier_id = 'Quartier obligatoire';
    if (f.numero_cni && !normaliserNumeroCni(f.numero_cni)) e.numero_cni = 'Saisissez les 13 chiffres de la carte d’identité sénégalaise';
    if (f.telephone && !normaliserTelephone(f.telephone)) e.telephone = 'Numéro invalide (ex. 77 123 45 67)';
    if (f.telephone2 && !normaliserTelephone(f.telephone2)) e.telephone2 = 'Numéro invalide';
    if ((f.latitude === '') !== (f.longitude === '')) e.latitude = 'Latitude et longitude vont ensemble';
    setErreurs(e);
    return !Object.keys(e).length;
  }

  async function enregistrer(forcer = false) {
    if (!valider()) return;
    setBusy(true);
    const body: any = { ...f, version: initial?.version };
    for (const k of ['quartier_id', 'secteur_id', 'coordonnateur_id', 'superviseur_id', 'commissaire_id']) body[k] = f[k] ? Number(f[k]) : null;
    for (const k of ['latitude', 'longitude']) body[k] = f[k] === '' ? null : Number(f[k]);
    for (const k of ['date_naissance', 'numero_cni', 'telephone', 'telephone2', 'email', 'adresse', 'repere', 'observations', 'source']) body[k] = f[k] || null;
    delete body.commune_id;
    try {
      const r = edition
        ? await api.put(`/militants/${initial.id}`, body, forcer ? { forcer: 'true' } : undefined)
        : await api.post('/militants', body, forcer ? { forcer: 'true' } : undefined);
      if (r.avertissements?.length) setAvert(r.avertissements);
      toast(edition ? 'Fiche mise à jour' : r.statut === 'ACTIF' ? `Militant ${r.numero} enregistré et validé` : `Militant ${r.numero} enregistré — en attente de validation`);
      onSaved(r.id || initial.id);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DOUBLON') setDoublons(e.details?.doublons || []);
      else if (e instanceof ApiError && e.champs) setErreurs(Object.fromEntries(e.champs.map((c) => [c.champ, c.message])));
      else toast(messageErreur(e), true);
    } finally { setBusy(false); }
  }

  function localiser() {
    if (!navigator.geolocation) { toast('Géolocalisation indisponible sur cet appareil', true); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setF((o) => ({ ...o, latitude: p.coords.latitude.toFixed(6), longitude: p.coords.longitude.toFixed(6) })),
      () => toast("Position refusée ou indisponible : saisissez les coordonnées manuellement", true),
      { enableHighAccuracy: true, timeout: 10000 });
  }

  const input = (k: string, props: any = {}) => (
    <input id={`m-${k}`} className={`input${erreurs[k] ? ' invalid' : ''}`} value={f[k]} onChange={(e) => set(k, e.target.value)} {...props} />
  );

  return (
    <Drawer titre={edition ? 'Modifier la fiche' : 'Nouveau militant'} sousTitre={edition ? `${initial.numero} · version ${initial.version}` : 'Les champs marqués * sont obligatoires'} onClose={onClose}
      pied={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={busy} onClick={() => enregistrer(false)}><Save size={15} /> {edition ? 'Enregistrer' : 'Créer la fiche'}</button>
      </>}>
      {doublons && (
        <Notice type="warn">
          <b>Doublon potentiel détecté.</b> Vérifiez avant d'enregistrer :
          <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
            {doublons.map((d) => <li key={d.id}><span className="mono">{d.numero}</span> — {d.prenoms} {d.nom}, {d.quartier} ({d.motif === 'telephone' ? 'même téléphone' : `identité proche ${Math.round(d.score * 100)} %`})</li>)}
          </ul>
          <button className="btn sm" onClick={() => enregistrer(true)} disabled={busy}>Ce n'est pas la même personne : enregistrer</button>
        </Notice>
      )}
      {avert.map((a) => <Notice key={a} type="warn">{a}</Notice>)}
      <fieldset><legend>Identification</legend>
        <div className="form-grid">
          <Field label="Nom" requis erreur={erreurs.nom}>{input('nom', { autoComplete: 'off', maxLength: 80 })}</Field>
          <Field label="Prénom(s)" requis erreur={erreurs.prenoms}>{input('prenoms', { autoComplete: 'off', maxLength: 120 })}</Field>
          <Field label="Sexe" requis erreur={erreurs.sexe}>
            <select id="m-sexe" className={`input${erreurs.sexe ? ' invalid' : ''}`} value={f.sexe} onChange={(e) => set('sexe', e.target.value)}>
              <option value="">Choisir…</option><option value="F">Femme</option><option value="M">Homme</option>
            </select>
          </Field>
          <Field label="Date de naissance" aide="Optionnelle" erreur={erreurs.date_naissance}>{input('date_naissance', { type: 'date', max: new Date().toISOString().slice(0, 10) })}</Field>
          <Field label="Numéro carte d’identification" aide="13 chiffres, facultatif. Chiffré en base." erreur={erreurs.numero_cni}>
            {input('numero_cni', { inputMode: 'numeric', autoComplete: 'off', placeholder: '1234567890123', maxLength: 15 })}
          </Field>
        </div>
      </fieldset>
      <fieldset><legend>Coordonnées</legend>
        <div className="form-grid">
          <Field label="Téléphone" erreur={erreurs.telephone} aide="Chiffré en base">{input('telephone', { inputMode: 'tel', placeholder: '77 123 45 67' })}</Field>
          <Field label="Téléphone 2" erreur={erreurs.telephone2}>{input('telephone2', { inputMode: 'tel' })}</Field>
          <Field label="Email" aide="Optionnel" erreur={erreurs.email} className="full">{input('email', { type: 'email' })}</Field>
          <Field label="Adresse complète" className="full" erreur={erreurs.adresse}>{input('adresse', { maxLength: 255 })}</Field>
          <Field label="Repère" className="full" aide="Ex. : près de la mosquée, face à la pharmacie">{input('repere', { maxLength: 255 })}</Field>
        </div>
      </fieldset>
      <fieldset><legend>Localisation</legend>
        <div className="form-grid">
          <Field label="Commune" requis>
            <select id="m-commune" className="input" value={f.commune_id} onChange={(e) => set('commune_id', e.target.value)}>
              <option value="">Choisir…</option>
              {terr?.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </Field>
          <Field label="Quartier" requis erreur={erreurs.quartier_id}>
            <select id="m-quartier" className={`input${erreurs.quartier_id ? ' invalid' : ''}`} value={f.quartier_id} onChange={(e) => set('quartier_id', e.target.value)} disabled={!commune}>
              <option value="">Choisir…</option>
              {commune?.quartiers.filter((q) => q.actif).map((q) => <option key={q.id} value={q.id}>{q.nom}</option>)}
            </select>
          </Field>
          <Field label="Secteur" aide="Optionnel">
            <select id="m-secteur" className="input" value={f.secteur_id} onChange={(e) => set('secteur_id', e.target.value)} disabled={!quartier}>
              <option value="">—</option>
              {quartier?.secteurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </Field>
          <div />
          <Field label="Latitude" erreur={erreurs.latitude}>{input('latitude', { inputMode: 'decimal', placeholder: '14.78…' })}</Field>
          <Field label="Longitude">{input('longitude', { inputMode: 'decimal', placeholder: '-17.39…' })}</Field>
          <div className="full"><button type="button" className="btn sm" onClick={localiser}><Crosshair size={13} /> Utiliser la position de l'appareil</button></div>
        </div>
      </fieldset>
      <fieldset><legend>Organisation</legend>
        <div className="form-grid">
          {(['coordonnateur', 'superviseur', 'commissaire'] as const).map((fn) => (
            <Field key={fn} label={fn.charAt(0).toUpperCase() + fn.slice(1)} aide={!f[`${fn}_id`] ? 'Automatique selon le quartier' : undefined}>
              <select id={`m-${fn}`} className="input" value={f[`${fn}_id`]} onChange={(e) => set(`${fn}_id`, e.target.value)} disabled={!f.quartier_id}>
                <option value="">Automatique</option>
                {respQuartier.filter((r) => r.fonction === fn.toUpperCase()).map((r) => <option key={r.id} value={r.id}>{r.prenoms} {r.nom}</option>)}
              </select>
            </Field>
          ))}
        </div>
      </fieldset>
      <fieldset><legend>Suivi</legend>
        <div className="form-grid">
          <Field label="Source de collecte">
            <select id="m-source" className="input" value={f.source} onChange={(e) => set('source', e.target.value)}>
              <option value="">—</option>
              {ref?.sources.filter((s: any) => s.actif).map((s: any) => <option key={s.code} value={s.code}>{s.libelle}</option>)}
            </select>
          </Field>
          <div />
          <Field label="Observations" className="full"><textarea id="m-observations" className="input" value={f.observations} onChange={(e) => set('observations', e.target.value)} maxLength={2000} /></Field>
          <label className="check full">
            <input id="m-info" type="checkbox" checked={!!f.information_personne} onChange={(e) => set('information_personne', e.target.checked)} />
            <span>La personne a été informée que ses données sont enregistrées par KIIRAAY pour l'organisation du parti, de ses droits d'accès, de rectification et d'opposition, et a donné son accord.</span>
          </label>
        </div>
      </fieldset>
      {!edition && !can('militants:valider') && <Notice type="info">La fiche sera créée « en attente de validation » par un coordonnateur.</Notice>}
    </Drawer>
  );
}
