import ElectricityForm from '@/components/ElectricityForm';

export default function Home() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">EcoEstudiante Web</h1>

      <div className="rounded-xl border p-4">
        <h2 className="mb-2 font-medium">Probar cálculo electricidad</h2>
        <ElectricityForm />
      </div>
    </main>
  );
}
