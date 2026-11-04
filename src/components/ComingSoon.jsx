// Henüz yapılmamış ekranlar için geçici kart.
export default function ComingSoon({ title, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </div>
  )
}
