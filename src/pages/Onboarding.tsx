import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import * as authService from '../services/auth';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    creatorType: '',
    preferredTone: '',
    primaryLanguage: ''
  });
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    try {
      const updated = await authService.updateOnboarding(formData);
      updateUser(updated);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to complete onboarding');
    }
  };

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-center items-center p-4 font-sans text-white">
      <div className="w-full max-w-[500px]">
        {/* Progress indicator */}
        <div className="flex gap-2 mb-12 px-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1 flex-1 bg-[#222] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: step >= i ? '100%' : '0%' }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="space-y-6">
              <div>
                <h2 className="text-3xl font-display font-medium tracking-tight mb-3">What type of creator are you?</h2>
                <p className="text-[#888]">This helps us tailor your AI models.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {['YouTuber', 'TikToker / Reels', 'Podcaster', 'Agency', 'Brand'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, creatorType: type })}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 ${formData.creatorType === type ? 'bg-[#1a1a1a] border-white text-white' : 'bg-[#111] border-[#222] text-[#888] hover:border-[#444] hover:bg-[#151515]'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="space-y-6">
              <div>
                <h2 className="text-3xl font-display font-medium tracking-tight mb-3">Preferred content tone?</h2>
                <p className="text-[#888]">How should Aurora sound by default?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {['Conversational & Authentic', 'Professional & Educational', 'High Energy & Fast Paced', 'Dramatic & Cinematic'].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setFormData({ ...formData, preferredTone: tone })}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 ${formData.preferredTone === tone ? 'bg-[#1a1a1a] border-white text-white' : 'bg-[#111] border-[#222] text-[#888] hover:border-[#444] hover:bg-[#151515]'}`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="space-y-6">
              <div>
                <h2 className="text-3xl font-display font-medium tracking-tight mb-3">Primary Language?</h2>
                <p className="text-[#888]">For scripts and auto-captions.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {['English', 'Spanish', 'Hindi', 'French', 'Japanese'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setFormData({ ...formData, primaryLanguage: lang })}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 ${formData.primaryLanguage === lang ? 'bg-[#1a1a1a] border-white text-white' : 'bg-[#111] border-[#222] text-[#888] hover:border-[#444] hover:bg-[#151515]'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 flex justify-between">
          <button
            onClick={handleBack}
            className={`px-6 py-3 rounded-2xl text-sm font-medium transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-[#888] hover:text-white'}`}
          >
            Back
          </button>
          <motion.button
            whileHover={{ scale: 0.98 }}
            whileTap={{ scale: 0.95 }}
            onClick={step === 3 ? handleSubmit : handleNext}
            disabled={(step === 1 && !formData.creatorType) || (step === 2 && !formData.preferredTone) || (step === 3 && !formData.primaryLanguage)}
            className="px-8 py-3 bg-white text-black rounded-2xl text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {step === 3 ? 'Complete Setup' : 'Continue'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
