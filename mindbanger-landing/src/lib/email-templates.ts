export const dailyEmailTemplates = {
  en: {
    subject: "Today's signal is ready 🎵",
    headline: "Good morning, time for your ritual.",
    body: "Today's signal is already tuned to the correct frequency. Take a moment for yourself.",
    cta: "Start today's signal",
    url: "https://mindbanger.com/mindbanger_daily/app/today"
  },
  sk: {
    subject: "Dnešný signál je pripravený 🎵",
    headline: "Dobré ráno, čas na tvoj rituál.",
    body: "Dnešný signál je už naladený na frekvenciu. Nájdi si chvíľu pre seba.",
    cta: "Spustiť dnešný signál",
    url: "https://mindbanger.com/mindbanger_daily/app/today"
  },
  cs: {
    subject: "Dnešní signál je připraven 🎵",
    headline: "Dobré ráno, čas na tvůj rituál.",
    body: "Dnešní signál je už naladěn na frekvenci. Najdi si chvíli pro sebe.",
    cta: "Spustit dnešní signál",
    url: "https://mindbanger.com/mindbanger_daily/app/today"
  }
};

export const welcomeEmailTemplates = {
  en: {
    subject: "Welcome to Mindbanger Daily",
    headline: "Welcome to Mindbanger",
    body: "Your mind has just become your most powerful tool. Get ready for daily clarity.",
    cta: "Log In",
    url: "https://mindbanger.com/mindbanger_daily/login"
  },
  sk: {
    subject: "Vitajte v Mindbanger Daily",
    headline: "Vitaj v Mindbanger",
    body: "Tvoja myseľ sa práve stala tvojím najsilnejším nástrojom. Priprav sa na dennú dávku čistoty.",
    cta: "Prihlásiť sa",
    url: "https://mindbanger.com/mindbanger_daily/login"
  },
  cs: {
    subject: "Vítejte v Mindbanger Daily",
    headline: "Vítej v Mindbanger",
    body: "Tvoje mysl se právě stala tvým nejsilnějším nástrojem. Připrav se na denní dávku čistoty.",
    cta: "Přihlásit se",
    url: "https://mindbanger.com/mindbanger_daily/login"
  }
};

// Generates HTML string
export function generateEmailHtml(headline: string, body: string, cta: string, url: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #050505; color: #ffffff; border-radius: 12px; border: 1px solid #1a1a1a;">
      <h2 style="color: #ffffff; text-align: center; margin-bottom: 20px;">${headline}</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #cccccc; text-align: center;">
        ${body}
      </p>
      <div style="text-align: center; margin-top: 40px; margin-bottom: 20px;">
        <a href="${url}" style="background-color: #f59e0b; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 16px;">
          ${cta}
        </a>
      </div>
    </div>
  `;
}