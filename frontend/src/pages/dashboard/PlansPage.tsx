import { useState, useEffect } from 'react';
import { Check, Zap, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { motion } from 'framer-motion';

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any[]>('subscription/plans/')
      .then(data => {
        setPlans(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSubscribe = async (planId: number, planName: string, amount: string) => {
    try {
      const data = await apiFetch<any>('subscription/payments/charge/', {
        method: 'POST',
        body: JSON.stringify({ plan_id: planId })
      });
      
      if (data.success) {
        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: 'StockSim',
          description: `${data.plan} Subscription`,
          order_id: data.order_id,
          handler: async function (response: any) {
            const verifyData = await apiFetch<any>('subscription/payments/verify/', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_name: planName
              })
            });
            if (verifyData.success) {
              alert('Payment successful! Subscription activated.');
              window.location.href = '/dashboard/subscription';
            } else {
              alert('Payment verification failed.');
            }
          },
          theme: { color: '#3b82f6' }
        };
        const rzp1 = new (window as any).Razorpay(options);
        rzp1.open();
      } else {
        alert(data.message || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error(error);
      alert('Error connecting to payment gateway.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Zap className="h-8 w-8 text-blue-500 opacity-50" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-16 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-500/20 mb-6">
          <Sparkles className="h-4 w-4" />
          Flexible Pricing for Every Scale
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Supercharge Your Supply Chain
        </h1>
        <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto">
          Professional inventory risk forecasting. Start for free, upgrade when you need massive compute power.
        </p>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto items-end">
        {plans.map((plan, idx) => {
          const isPremium = plan.name.toLowerCase().includes('premium');
          const isCurrent = parseFloat(plan.amount) === 0;
          
          return (
            <motion.div 
              key={plan.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
              className={`relative flex flex-col rounded-[2rem] p-8 shadow-xl transition-all ${
                isPremium 
                  ? 'bg-slate-900 text-white ring-1 ring-white/10 shadow-blue-900/20 md:-mt-8 md:pb-12' 
                  : 'bg-white border border-slate-200 text-slate-900'
              }`}
            >
              {isPremium && (
                <>
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none" />
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-1.5 text-xs font-black text-white shadow-lg shadow-blue-500/30 flex items-center gap-1.5 tracking-wider">
                    <Zap className="h-3.5 w-3.5 fill-white" />
                    RECOMMENDED
                  </div>
                </>
              )}
              
              <div className="relative z-10">
                <h3 className={`text-2xl font-bold ${isPremium ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                <div className="mt-4 flex items-baseline text-4xl lg:text-5xl font-black tracking-tight">
                  ₹{parseFloat(plan.amount)}
                  <span className={`ml-1 lg:ml-2 text-sm lg:text-base font-medium ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>/mo</span>
                </div>
                <p className={`mt-4 text-sm leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-500'}`}>
                  {plan.description}
                </p>
                
                <div className={`mt-8 h-px w-full ${isPremium ? 'bg-white/10' : 'bg-slate-100'}`} />

                <ul className="mt-8 flex-1 space-y-4">
                  {[
                    `${plan.run_limit} Simulation Runs`,
                    'Detailed Risk Reports',
                    isPremium ? 'Advanced AI Forecasting' : 'Basic Policy Comparison',
                    isPremium && 'Priority 24/7 Support'
                  ].filter(Boolean).map((feature: any, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full ${isPremium ? 'bg-blue-500/20 text-cyan-400' : 'bg-emerald-100 text-emerald-600'}`}>
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </div>
                      <span className={`text-sm font-semibold ${isPremium ? 'text-slate-200' : 'text-slate-700'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleSubscribe(plan.id, plan.name, plan.amount)}
                  disabled={isCurrent}
                  className={`mt-10 w-full rounded-2xl py-4 text-sm font-black transition-all duration-300 ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isPremium
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10'
                  }`}
                >
                  {isCurrent ? 'Current Active Plan' : 'Subscribe Now'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}