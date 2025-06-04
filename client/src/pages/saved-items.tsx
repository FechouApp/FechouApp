
import SavedItemsManager from "@/components/saved-items/saved-items-manager";
import Header from "@/components/layout/header";

export default function SavedItemsPage() {
  return (
    <div className="space-y-8">
      <Header 
        title="Itens Favoritos Salvos"
        subtitle="Gerencie seus itens favoritos salvos para usar nos orçamentos"
        backTo="/dashboard"
      />
      
      <div className="max-w-4xl">
        <SavedItemsManager />
      </div>
    </div>
  );
}
