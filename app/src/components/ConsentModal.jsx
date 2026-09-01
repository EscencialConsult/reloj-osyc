// Consentimiento biométrico (Ley 25.326). Se muestra la 1ª vez, antes de la cámara.
export const CONSENT_VER = 'v1'

export default function ConsentModal({ onAceptar, onRechazar }) {
  return (
    <div className="consent-ov">
      <div className="consent-card">
        <div className="consent-band" />
        <div className="consent-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="38" height="38">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div className="consent-title">Registro facial para fichar</div>
        <div className="consent-body">
          <p>Para fichar con reconocimiento facial, <b>OSYC</b> necesita registrar y usar un <b>dato biométrico</b>: un código matemático de tu rostro.</p>
          <ul>
            <li><b>No se guardan fotos</b>, solo un vector de números del que <b>no se puede reconstruir</b> tu cara.</li>
            <li>Se usa <b>únicamente</b> para verificar tu identidad al fichar entrada/salida.</li>
            <li>Podés pedir que se <b>borre</b> cuando dejes de trabajar o si revocás el consentimiento.</li>
          </ul>
          <p className="consent-legal">Al tocar <b>Acepto</b>, autorizás este uso conforme a la Ley 25.326 de Protección de los Datos Personales. Queda registrada la fecha y hora de tu aceptación.</p>
        </div>
        <button className="consent-btn ok" onClick={onAceptar}>Acepto</button>
        <button className="consent-btn no" onClick={onRechazar}>Ahora no</button>
      </div>
    </div>
  )
}
