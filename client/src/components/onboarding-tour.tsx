import React from "react";
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from "react-joyride";
import { useToast } from "@/hooks/use-toast";

interface OnboardingTourProps {
  run: boolean;
  onFinish: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ run, onFinish }) => {
  const { toast } = useToast();
  const steps: Step[] = [
    {
      target: ".dashboard-welcome",
      content: (
        <div className="space-y-3 p-1">
          <p className="font-extrabold text-xl text-primary flex items-center gap-2">
            🚀 Ready for takeoff?
          </p>
          <p className="text-slate-600 leading-relaxed">
            Welcome to <span className="font-bold text-slate-800">BookingPro</span>. This dashboard is your new professional headquarters.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: ".analytics-section",
      content: (
        <div className="space-y-3 p-1">
          <p className="font-bold text-lg text-slate-800 flex items-center gap-2">
            📊 Your Growth, Simplified
          </p>
          <p className="text-slate-600 leading-relaxed">
            We track every booking, completion, and growth metric so you can focus on what you do best.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: ".appointments-section",
      content: (
        <div className="space-y-3 p-1">
          <p className="font-bold text-lg text-slate-800 flex items-center gap-2">
            📅 Master Your Schedule
          </p>
          <p className="text-slate-600 leading-relaxed">
            Manage your daily appointments with one click. Everything is live and stays in sync.
          </p>
          <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
            <p className="text-xs font-bold text-primary uppercase">Pro Tip</p>
            <p className="text-xs text-slate-500 italic">Try clicking an appointment to see client details!</p>
          </div>
        </div>
      ),
      placement: "top",
    },
    {
      target: ".navigation-memos",
      content: (
        <div className="space-y-2">
          <p className="font-bold text-slate-800">🧠 Professional Memos</p>
          <p className="text-slate-600">Secure clinical notes or quick reminders that follow you anywhere.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: ".navigation-tasks",
      content: (
        <div className="space-y-2">
          <p className="font-bold text-slate-800">✅ Dynamic Tasks</p>
          <p className="text-slate-600">Prioritize your day and never miss a beat with your smart to-do list.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: ".navigation-settings",
      content: (
        <div className="space-y-3 p-1">
          <p className="font-bold text-lg text-primary flex items-center gap-2">
            ✨ Build Your Brand
          </p>
          <p className="text-slate-600 leading-relaxed">
            Customize your professional title, social links, and booking page to impress your clients.
          </p>
          <p className="text-sm font-bold text-slate-800 underline decoration-primary decoration-2 underline-offset-4">This is where the magic happens!</p>
        </div>
      ),
      placement: "bottom",
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;
    
    if (type === EVENTS.STEP_AFTER) {
      if (index === 0) {
        toast({
          title: "Starting strong! 💪",
          description: "Let's check out your business metrics next.",
          duration: 3000,
        });
      }
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      onFinish();
      toast({
        title: "Practice Perfected! 🎉",
        description: "You've mastered the essentials. Time to grow your practice!",
        variant: "default",
      });
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      spotlightPadding={10}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "#1e293b",
          zIndex: 5000,
          backgroundColor: "#ffffff",
          arrowColor: "#ffffff",
        },
        tooltip: {
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        },
        tooltipContent: {
          padding: "10px 0",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "14px",
          padding: "14px 28px",
          fontWeight: "700",
          fontSize: "15px",
          transition: "all 0.2s ease",
        },
        buttonBack: {
          marginRight: "15px",
          color: "#64748b",
          fontWeight: "700",
          fontSize: "15px",
        },
        buttonSkip: {
          color: "#94a3b8",
          fontSize: "15px",
          fontWeight: "600",
        },
        spotlight: {
          borderRadius: "20px",
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6), 0 0 15px rgba(59, 130, 246, 0.5)",
          border: "3px solid hsl(var(--primary))",
        },
      }}
    />
  );
};