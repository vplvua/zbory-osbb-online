import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import ProtocolForm from '@/app/osbb/[osbbId]/protocols/_components/protocol-form';
import {
  addQuestionAction,
  deleteProtocolAction,
  deleteQuestionAction,
  updateProtocolAction,
  updateQuestionAction,
} from '@/app/osbb/[osbbId]/protocols/actions';
import {
  QuestionCreateForm,
  QuestionItemForm,
} from '@/app/osbb/[osbbId]/protocols/_components/question-forms';
import DeleteProtocolForm from '@/app/osbb/[osbbId]/protocols/_components/protocol-delete-form';

export default async function ProtocolEditPage({
  params,
}: {
  params: Promise<{ osbbId: string; protocolId: string }>;
}) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const { osbbId, protocolId } = await params;
  const protocol = await prisma.protocol.findFirst({
    where: {
      id: protocolId,
      osbb: { id: osbbId, userId: session.sub, isDeleted: false },
    },
    include: {
      questions: { orderBy: { orderNumber: 'asc' } },
      osbb: true,
    },
  });

  if (!protocol) {
    redirect('/osbb');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-sm text-neutral-600">
          <Link
            href={`/osbb/${protocol.osbbId}/protocols`}
            className="text-blue-600 hover:underline"
          >
            ← Назад до протоколів
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Редагувати протокол</h1>
        <p className="text-sm text-neutral-600">{protocol.osbb.name}</p>
      </div>

      <ProtocolForm
        action={updateProtocolAction}
        submitLabel="Зберегти протокол"
        defaultValues={{
          protocolId: protocol.id,
          number: protocol.number,
          date: protocol.date.toISOString().split('T')[0],
          type: protocol.type,
        }}
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Питання порядку денного</h2>
        {protocol.questions.length === 0 ? (
          <p className="text-sm text-neutral-600">Питання ще не додані.</p>
        ) : (
          <div className="space-y-4">
            {protocol.questions.map((question) => (
              <QuestionItemForm
                key={question.id}
                action={updateQuestionAction}
                deleteAction={deleteQuestionAction}
                question={question}
              />
            ))}
          </div>
        )}
      </section>

      <QuestionCreateForm action={addQuestionAction} protocolId={protocol.id} />

      <section className="rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold">Видалення протоколу</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Протокол буде видалено без можливості відновлення.
        </p>
        <div className="mt-4">
          <DeleteProtocolForm protocolId={protocol.id} action={deleteProtocolAction} />
        </div>
      </section>
    </main>
  );
}
