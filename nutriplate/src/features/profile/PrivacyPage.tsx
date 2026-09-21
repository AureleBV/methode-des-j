import { useNavigate } from 'react-router-dom';
import { Card, PageHeader } from '@/components/ui';

/** Page "Données & confidentialité" : ce qui reste sur l'appareil, ce qui sort, et quand. */
export function PrivacyPage() {
  const nav = useNavigate();
  return (
    <div className="fade-in space-y-3">
      <PageHeader title="Données & confidentialité" back={() => nav(-1)} />
      <Card className="space-y-2 text-sm">
        <p className="font-semibold">Ce que fait NutriPlate</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Aucun compte, aucun serveur NutriPlate.</b> Toutes tes données (profil, journal, poids, séances, prix) sont stockées dans le navigateur de cet appareil (IndexedDB / localStorage).</li>
          <li><b>Aucun cookie</b>, aucun traceur, aucune publicité, aucune statistique d’usage. Il n’y a donc pas de bandeau à accepter.</li>
          <li>Tu peux exporter, importer et supprimer tes données à tout moment (Profil → Données). Supprimer un profil efface sa base.</li>
        </ul>
      </Card>
      <Card className="space-y-2 text-sm">
        <p className="font-semibold">Ce qui peut sortir de l’appareil, uniquement quand tu utilises la fonction</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Open Food Facts</b> (recherche de produits, code-barres) : le texte recherché ou le code-barres. Base ouverte et collaborative, hébergée en France.</li>
          <li><b>Open Prices</b> (prix moyens) : le code-barres du produit.</li>
          <li><b>OpenStreetMap / Overpass</b> (magasins autour de toi) : ta position arrondie à ~100 m, seulement après ton accord et quand tu ouvres la page. Les tuiles de carte proviennent d’OpenStreetMap.</li>
          <li><b>Modèle d’analyse photo local</b> : téléchargé une fois depuis les serveurs TensorFlow (Google Cloud Storage). Les photos, elles, ne sortent jamais dans ce mode.</li>
          <li><b>Gemini (facultatif, désactivé par défaut)</b> : si tu ajoutes ta propre clé, les photos analysées sont envoyées à Google. Ta clé reste sur l’appareil.</li>
          <li><b>Dictée et lecture vocale</b> : fonctions du navigateur. Sur certains téléphones, la reconnaissance vocale passe par le service vocal du système (Google, Apple).</li>
        </ul>
      </Card>
      <Card className="space-y-2 text-sm">
        <p className="font-semibold">Permissions</p>
        <p>Caméra (code-barres, photo), micro (dictée) et position (magasins) sont demandées au moment de l’action, jamais avant, et tu peux refuser : chaque fonction a une alternative manuelle.</p>
      </Card>
      <Card className="space-y-2 text-sm">
        <p className="font-semibold">Santé</p>
        <p>NutriPlate n’est pas un dispositif médical. Les objectifs et analyses sont des estimations. En cas de doute, de pathologie, de grossesse ou de rapport compliqué à l’alimentation, parle-en à un professionnel de santé.</p>
      </Card>
      <Card className="space-y-2 text-sm">
        <p className="font-semibold">Sources des données</p>
        <p>Valeurs nutritionnelles indicatives issues de tables publiques (CIQUAL / ANSES, USDA), arrondies. Produits : Open Food Facts (licence ODbL). Cartes : © contributeurs OpenStreetMap (ODbL). Code source de l’app : ouvert, sur GitHub.</p>
      </Card>
    </div>
  );
}
