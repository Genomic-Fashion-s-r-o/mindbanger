import Link from 'next/link';

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900/50 p-8 rounded-3xl border border-white/5">
        
        <h1 className="text-3xl font-serif text-white">Payment Cancelled</h1>
        <p className="text-slate-400">
           Your checkout process was not completed. You have not been charged.
        </p>

        <div className="pt-8">
           <Link 
             href="/mindbanger_daily/checkout"
             className="inline-block px-8 py-3 rounded-full bg-slate-800 text-white font-medium hover:bg-slate-700 transition"
           >
             Return to Checkout
           </Link>
        </div>
      </div>
    </div>
  );
}
