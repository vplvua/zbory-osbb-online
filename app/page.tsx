import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppHeader from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSessionPayload } from '@/lib/auth/session-token';

type IconProps = React.SVGProps<SVGSVGElement>;

function BoltIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
    </svg>
  );
}

function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function WarningIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function DocumentIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function InfoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function ArrowRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function PhoneIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.35 1.78.68 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.25a2 2 0 0 1 2.11-.45c.85.33 1.73.56 2.63.68A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

const heroPoints = ['Прозорий процес', 'Електронне підписання', 'Безкоштовно для всіх ОСББ'];

const challenges = [
  'Неможливо зібрати всіх співвласників одночасно',
  'Листки губляться або повертаються неповністю заповненими',
  'Потрібно обдзвонювати мешканців',
  'Складно контролювати, хто вже підписав',
  'Документи потрібно довго зберігати в архіві',
  'Процес займає багато часу та ресурсів правління',
];

const solutionSteps = [
  'Створити листок опитування за протоколом ОСББ',
  'Надіслати співвласнику персональне посилання',
  'Отримати електронний підпис',
  'Контролювати статус підписання в реальному часі',
  'Завантажити підписані документи у форматі PDF',
  'Уся робота відбувається у веббраузері',
];

const workflowSteps = [
  {
    title: '1. Створення',
    description:
      'Уповноважена особа створює листок опитування та надсилає співвласнику персональне посилання.',
  },
  {
    title: '2. Підписання',
    description: 'Співвласник відповідає на питання та підписує документ онлайн.',
  },
  {
    title: '3. Завершення',
    description:
      'Уповноважена особа накладає свій підпис та завантажує підписані документи для зберігання.',
  },
];

const benefits = [
  'Менше ручної роботи',
  'Прозорий контроль процесу',
  'Зменшення ризику втрати документів',
  'Залучення співвласників, які не можуть бути присутні фізично',
  'Безкоштовне користування без обмежень',
];

const faqItems = [
  {
    question: 'Чи потрібно встановлювати додаткові програми?',
    answer: 'Ні. Основна робота відбувається у веббраузері.',
  },
  {
    question: 'Скільки коштує користування?',
    answer: 'Сервіс надається безкоштовно як частина екосистеми Моє ОСББ.',
  },
  {
    question: 'Як швидко можна почати роботу?',
    answer: 'Одразу після входу: створіть ОСББ, протокол, співвласника і листок опитування.',
  },
  {
    question: 'Чи можна контролювати статус підписання?',
    answer: 'Так. Ви бачите, хто вже підписав документ, а хто ще ні.',
  },
  {
    question: 'Що робити з підписаними документами?',
    answer: 'Підписані документи можна завантажити у форматі PDF та зберігати в архіві ОСББ.',
  },
];

const landingSectionsClassName = 'mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8';

export default async function HomePage() {
  const session = await getSessionPayload();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        title="МОЄ ОСББ"
        containerClassName="max-w-5xl"
        actionButton={{ label: 'Увійти', href: '/login', variant: 'outline' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className={landingSectionsClassName}>
          <section className="landing-reveal">
            <Card className="overflow-hidden">
              <CardContent className="relative p-0">
                <div className="from-brand/6 via-surface to-surface absolute inset-0 bg-gradient-to-br" />
                <div className="relative grid gap-0 md:grid-cols-[1.28fr_1fr]">
                  <div className="flex h-full flex-col p-4 md:p-10">
                    <div className="space-y-5">
                      <p className="text-brand bg-brand/10 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold">
                        <BoltIcon className="h-4 w-4" />
                        Сервіс для ОСББ
                      </p>
                      <h1 className="text-3xl font-bold md:text-4xl">
                        Письмове опитування в ОСББ швидко, онлайн і без паперу
                      </h1>
                      <p className="text-muted-foreground max-w-3xl text-base">
                        Зручно проводьте письмове опитування співвласників без паперової плутанини,
                        втрат документів та зайвих дзвінків.
                      </p>
                      <ul className="grid gap-2 text-sm">
                        {heroPoints.map((point) => (
                          <li
                            key={point}
                            className="text-muted-foreground border-border/70 bg-surface/70 flex items-center gap-2 rounded-md border px-3 py-2"
                          >
                            <CheckIcon className="text-brand h-4 w-4" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-8 md:mt-auto md:pt-8">
                      <Link href="/login">
                        <Button type="button" className="group w-full sm:w-auto">
                          Почати роботу
                          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="border-border relative flex items-center justify-center border-t p-4 md:border-t-0 md:border-l md:p-6">
                    <Image
                      src="/landing/hero-photo-v2.png"
                      alt="Ілюстрація онлайн-письмового опитування в ОСББ"
                      width={1024}
                      height={1536}
                      className="landing-illustration h-auto w-full object-contain md:scale-110"
                      priority
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="landing-reveal" style={{ animationDelay: '60ms' }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <InfoIcon className="text-brand h-5 w-5" />
                  Про сервіс
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-center">
                <div className="space-y-3 md:self-center">
                  <p className="text-muted-foreground text-sm">
                    Zbory — це безкоштовний онлайн-інструмент для проведення письмового опитування в
                    ОСББ, створений командою{' '}
                    <a
                      href="https://moeosbb.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      Моє ОСББ
                    </a>{' '}
                    для спрощення роботи правління та підвищення прозорості процесів.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Сервіс є частиною екосистеми{' '}
                    <a
                      href="https://moeosbb.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      Моє ОСББ
                    </a>{' '}
                    і розроблений з урахуванням реальних потреб уповноважених осіб та співвласників.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Наша мета — зробити процес письмового опитування зрозумілим, зручним та
                    доступним для кожного ОСББ.
                  </p>
                </div>
                <div className="border-border/70 bg-surface-muted/60 rounded-xl border p-2">
                  <Image
                    src="/landing/about-service-photo.png"
                    alt="Ілюстрація безпечного документообігу для ОСББ"
                    width={1536}
                    height={1024}
                    className="landing-illustration h-auto w-full rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="landing-reveal" style={{ animationDelay: '90ms' }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <WarningIcon className="h-5 w-5 text-amber-600" />
                  Коли письмове опитування стає складним
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="grid gap-3 md:grid-cols-2">
                  {challenges.map((challenge) => (
                    <li
                      key={challenge}
                      className="landing-card text-muted-foreground border-border/70 bg-surface/70 flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {challenge}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="landing-reveal" style={{ animationDelay: '120ms' }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BoltIcon className="text-brand h-5 w-5" />
                  Рішення
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Сервіс Zbory допомагає організувати письмове опитування в цифровому форматі.
                </p>
                <p className="text-sm font-semibold">Ви можете:</p>
                <ul className="grid gap-2 md:grid-cols-2">
                  {solutionSteps.map((step) => (
                    <li
                      key={step}
                      className="landing-card text-muted-foreground border-border/70 bg-surface/70 flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <CheckIcon className="text-brand mt-0.5 h-4 w-4 shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="landing-reveal" style={{ animationDelay: '150ms' }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DocumentIcon className="text-brand h-5 w-5" />
                  Як це працює
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-border/70 bg-surface-muted/55 rounded-xl border p-2">
                  <Image
                    src="/landing/how-it-works-photo.png"
                    alt="Ілюстрація етапів: створення, підписання та збереження документів"
                    width={1536}
                    height={520}
                    className="landing-illustration h-auto w-full rounded-lg"
                  />
                </div>
                <ol className="grid gap-3 md:grid-cols-3">
                  {workflowSteps.map((step) => (
                    <li key={step.title} className="border-border rounded-md border p-4 text-sm">
                      <p className="mb-2 font-semibold">{step.title}</p>
                      <p className="text-muted-foreground">{step.description}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </section>

          <section className="landing-reveal" style={{ animationDelay: '180ms' }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldIcon className="h-5 w-5 text-emerald-600" />
                  Відповідність законодавству
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Сервіс розроблений з урахуванням вимог до письмового опитування в ОСББ.
                </p>
                <p className="text-muted-foreground text-sm">
                  Формування листка опитування, електронне підписання та збереження документів
                  здійснюються у цифровому форматі для подальшого використання та архівування.
                </p>
                <div className="text-muted-foreground border-border/70 bg-surface-muted/70 space-y-1 rounded-md border px-3 py-2 text-xs">
                  <p>Використовуються підписи типу CAdES-B-LT (ETSI EN 319 122-1).</p>
                  <p>Підписання документів через Дія.Підпис, ключем ЕЦП, SmartID, monoКЕП.</p>
                  <p>
                    Для підписання використовується сервіс{' '}
                    <a
                      href="https://my.dubidoc.com.ua/auth?ref=ZDJBhNlaeX"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      Dubidoc
                    </a>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="landing-reveal" style={{ animationDelay: '210ms' }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckIcon className="h-5 w-5 text-emerald-600" />
                  Переваги
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 md:grid-cols-2">
                  {benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="landing-card text-muted-foreground border-border/70 bg-surface/70 flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <CheckIcon className="text-brand mt-0.5 h-4 w-4 shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <section id="faq" className="landing-reveal" style={{ animationDelay: '240ms' }}>
            <Card>
              <CardHeader>
                <CardTitle>Поширені запитання</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {faqItems.map((faqItem) => (
                  <details
                    key={faqItem.question}
                    className="landing-card border-border bg-surface rounded-md border px-4 py-3"
                  >
                    <summary className="flex cursor-pointer items-start justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                      <span>{faqItem.question}</span>
                      <span className="text-brand mt-0.5 text-base">+</span>
                    </summary>
                    <p className="text-muted-foreground mt-2 text-sm">{faqItem.answer}</p>
                  </details>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="landing-reveal" style={{ animationDelay: '270ms' }}>
            <Card>
              <CardContent className="grid gap-5 p-8 md:grid-cols-[1.2fr_1fr] md:items-center">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold">
                    Потрібно провести письмове опитування співвласників?
                  </h2>
                  <p className="text-muted-foreground text-sm">Почніть роботу вже сьогодні.</p>
                  <p className="text-muted-foreground text-sm">
                    Сервіс доступний безкоштовно для всіх ОСББ.
                  </p>
                  <Link href="/login">
                    <Button type="button" className="w-full md:w-auto">
                      Почати роботу
                    </Button>
                  </Link>
                </div>
                <div className="border-border/70 bg-surface-muted/55 rounded-xl border p-2">
                  <Image
                    src="/landing/cta-photo.png"
                    alt="Ілюстрація письмового опитування співвласників ОСББ"
                    width={1536}
                    height={1024}
                    className="landing-illustration h-auto w-full rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="landing-reveal" style={{ animationDelay: '300ms' }}>
            <Card>
              <CardHeader>
                <CardTitle>Контакти</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm">
                  <a
                    className="text-brand inline-flex items-center gap-2 hover:underline"
                    href="tel:+380672203310"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    067-220-33-10
                  </a>
                  <a
                    className="text-brand inline-flex items-center gap-2 hover:underline"
                    href="mailto:zbory@moeosbb.com"
                  >
                    <MailIcon className="h-4 w-4" />
                    zbory@moeosbb.com
                  </a>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
