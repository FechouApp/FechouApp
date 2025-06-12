import BackButton from "@/components/common/back-button";
import ReferralShare from "@/components/referral/referral-share";

export default function ReferralsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <BackButton />
        
        <div className="mt-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Sistema de Indicações</h1>
            <p className="text-gray-600 mt-2">
              Indique amigos e ganhe recompensas incríveis no Fechou!
            </p>
          </div>

          <ReferralShare />
        </div>
      </div>
    </div>
  );
}