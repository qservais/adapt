export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white px-6 py-12 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-[#00F5A0] mb-1">ADAPT by LMJ</h1>
        <h2 className="text-xl font-semibold text-white">Politique de confidentialité</h2>
        <p className="text-sm text-gray-400 mt-1">Dernière mise à jour : 27 mars 2026</p>
      </div>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">1. Présentation</h3>
        <p className="text-gray-300 leading-relaxed">
          ADAPT by LMJ est une application de coaching fitness personnalisé développée par Loïc Mehdi Houmy Jaumotte. Elle est réservée aux athlètes suivis par le coach Loïc Mehdi Houmy Jaumotte. Cette politique décrit quelles données sont collectées, comment elles sont utilisées et protégées.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">2. Données collectées</h3>
        <p className="text-gray-300 leading-relaxed mb-3">Dans le cadre du coaching, l'application collecte les données suivantes :</p>
        <ul className="text-gray-300 space-y-2 list-disc list-inside">
          <li>Informations d'identification : nom, prénom, adresse email</li>
          <li>Données de santé et de forme : scores de récupération (sommeil, énergie, stress, courbatures, motivation), RPE (niveau d'effort perçu), données d'entraînement</li>
          <li>Données nutritionnelles : aliments scannés et consommés (si la fonctionnalité nutrition est utilisée)</li>
          <li>Données d'utilisation : historique des séances, progression, statistiques d'entraînement</li>
          <li>Communications : messages échangés avec le coach via la messagerie intégrée</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">3. Utilisation des données</h3>
        <p className="text-gray-300 leading-relaxed mb-3">Les données collectées sont utilisées exclusivement pour :</p>
        <ul className="text-gray-300 space-y-2 list-disc list-inside">
          <li>Adapter les programmes d'entraînement à l'état physique et mental de l'athlète</li>
          <li>Permettre au coach de suivre la progression de l'athlète</li>
          <li>Générer des statistiques personnelles de performance</li>
          <li>Faciliter la communication entre l'athlète et le coach</li>
        </ul>
        <p className="text-gray-300 leading-relaxed mt-3">
          Aucune donnée n'est vendue, partagée ou transmise à des tiers à des fins commerciales ou publicitaires.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">4. Stockage et sécurité</h3>
        <p className="text-gray-300 leading-relaxed">
          Les données sont stockées de manière sécurisée sur des serveurs hébergés par Replit Inc. (États-Unis). Les communications sont chiffrées via TLS/HTTPS. Les mots de passe sont hashés avec bcrypt et ne sont jamais stockés en clair. L'accès aux données est protégé par authentification JWT.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">5. Accès et contrôle de vos données</h3>
        <p className="text-gray-300 leading-relaxed">
          Vous pouvez à tout moment demander l'accès, la rectification ou la suppression de vos données personnelles en contactant le coach directement via la messagerie de l'application ou par email. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">6. Données de santé</h3>
        <p className="text-gray-300 leading-relaxed">
          Les données de bilan quotidien (sommeil, énergie, stress, etc.) sont considérées comme des données de bien-être. Elles ne sont pas partagées avec des tiers et sont utilisées uniquement dans le cadre du suivi coaching. L'application ne collecte pas de données médicales au sens légal du terme.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">7. Permissions requises</h3>
        <ul className="text-gray-300 space-y-2 list-disc list-inside">
          <li><strong className="text-white">Caméra</strong> : utilisée uniquement pour scanner les codes-barres alimentaires dans la section nutrition. Aucune image n'est sauvegardée ni transmise.</li>
          <li><strong className="text-white">Notifications</strong> : utilisées pour envoyer des rappels de séance et des messages du coach.</li>
          <li><strong className="text-white">Accès réseau</strong> : nécessaire pour synchroniser les données avec le serveur.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">8. Conservation des données</h3>
        <p className="text-gray-300 leading-relaxed">
          Les données sont conservées pendant toute la durée du suivi coaching. En cas d'arrêt du suivi, les données peuvent être supprimées sur demande. Les données sont automatiquement supprimées en cas de clôture du compte.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">9. Contact</h3>
        <p className="text-gray-300 leading-relaxed">
          Pour toute question relative à vos données personnelles ou à cette politique de confidentialité, vous pouvez contacter :<br />
          <span className="text-white font-medium">Loïc Mehdi Houmy Jaumotte</span><br />
          Via la messagerie intégrée à l'application ou via le tableau de bord coach.
        </p>
      </section>

      <div className="border-t border-white/10 pt-6 mt-8">
        <p className="text-xs text-gray-500">
          © 2026 Loïc Mehdi Houmy Jaumotte — ADAPT by LMJ. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
