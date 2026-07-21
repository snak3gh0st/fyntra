import { prisma } from '@/lib/prisma'
import { createCommissionPlan } from './actions'

export const dynamic = 'force-dynamic'

export default async function CommissionPlansPage() {
  const plans = await prisma.commissionPlan.findMany({ orderBy: [{ rank: 'asc' }, { downlineLevel: 'asc' }] })

  return (
    <main>
      <h1>Planos de comissão</h1>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Nível de downline</th>
            <th>% de override</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id}>
              <td>{plan.rank}</td>
              <td>{plan.downlineLevel}</td>
              <td>{plan.overridePercent.toString()}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Novo plano</h2>
      <form action={createCommissionPlan}>
        <input name="rank" placeholder="Rank (ex: MANAGER)" required />
        <input name="downlineLevel" type="number" min={1} placeholder="Nível" required />
        <input name="overridePercent" type="number" step="0.01" placeholder="% override" required />
        <button type="submit">Salvar</button>
      </form>
    </main>
  )
}
