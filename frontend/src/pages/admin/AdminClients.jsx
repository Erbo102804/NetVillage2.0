import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchClients, removeClient, updateClient } from '../../store/slices/adminSlice'
import { adminAPI } from '../../api/endpoints'
import { formatDate, formatMoney } from '../../utils/date'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import toast from 'react-hot-toast'

const TARIFFS = ['tariff-5mbps', 'tariff-10mbps', 'tariff-15mbps', 'tariff-25mbps']

export default function AdminClients() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { clients, loading } = useSelector(s => s.admin)

  const [search, setSearch] = useState('')
  const [tariffFilter, setTariffFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [extendModal, setExtendModal] = useState(null)
  const [tariffModal, setTariffModal] = useState(null)

  useEffect(() => {
    dispatch(fetchClients({ search, tariff: tariffFilter, active: activeFilter }))
  }, [dispatch, search, tariffFilter, activeFilter])

  const handleToggle = async (client, action) => {
    try {
      await adminAPI.toggleClient(client.id, action)
      toast.success(action === 'enable' ? 'Клиент включён' : 'Клиент отключён')
      dispatch(fetchClients({ search, tariff: tariffFilter, active: activeFilter }))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка')
    }
  }

  const handleDelete = async (client) => {
    if (!confirm(`Удалить клиента ${client.full_name}?`)) return
    try {
      await adminAPI.deleteClient(client.id)
      dispatch(removeClient(client.id))
      toast.success('Клиент удалён')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка удаления')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Клиенты</h1>
          <p className="text-slate-400 mt-1">{clients.length} клиентов</p>
        </div>
        <button onClick={() => navigate('/admin/clients/new')} className="btn-primary">
          + Добавить клиента
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Поиск по имени, телефону, логину..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <select
          value={tariffFilter}
          onChange={e => setTariffFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">Все тарифы</option>
          {TARIFFS.map(t => (
            <option key={t} value={t}>{t.replace('tariff-', '')}</option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={e => setActiveFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">Все статусы</option>
          <option value="true">Активные</option>
          <option value="false">Неактивные</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-700">
                {['Имя', 'Телефон', 'PPPoE', 'Тариф', 'Истекает', 'Статус', 'Платежи', 'Действия'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-slate-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {clients.map(client => {
                const daysLeft = client.subscription_end
                  ? Math.ceil((new Date(client.subscription_end) - new Date()) / 86400000)
                  : null
                const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-100">{client.full_name || client.username}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{client.phone}</td>
                    <td className="py-3 pr-4 font-mono text-slate-300 text-xs">{client.pppoe_login}</td>
                    <td className="py-3 pr-4">
                      <div className="text-slate-200">{client.tariff_speed}</div>
                      <div className="text-slate-500 text-xs">{formatMoney(client.tariff_price)}/мес</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className={`text-sm ${isExpiringSoon ? 'text-yellow-400 font-medium' : 'text-slate-300'}`}>
                        {client.subscription_end ? formatDate(client.subscription_end) : '—'}
                      </div>
                      {isExpiringSoon && <div className="text-yellow-500 text-xs">⚠️ {daysLeft} дн.</div>}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={client.is_active_subscription ? 'active' : 'inactive'} />
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{client.payment_count}</td>
                    <td className="py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setExtendModal(client)}
                          className="btn-secondary text-xs py-1 px-2"
                          title="Продлить"
                        >
                          +📅
                        </button>
                        <button
                          onClick={() => setTariffModal(client)}
                          className="btn-secondary text-xs py-1 px-2"
                          title="Тариф"
                        >
                          📶
                        </button>
                        <button
                          onClick={() => handleToggle(client, client.is_active_subscription ? 'disable' : 'enable')}
                          className={`text-xs py-1 px-2 btn ${client.is_active_subscription ? 'btn-danger' : 'btn-success'}`}
                          title={client.is_active_subscription ? 'Отключить' : 'Включить'}
                        >
                          {client.is_active_subscription ? '🔴' : '🟢'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {clients.length === 0 && (
            <div className="text-center py-12 text-slate-500">Клиенты не найдены</div>
          )}
        </div>
      )}

      {/* Extend modal */}
      <ExtendModal
        client={extendModal}
        onClose={() => setExtendModal(null)}
        onSuccess={() => {
          setExtendModal(null)
          dispatch(fetchClients({ search, tariff: tariffFilter, active: activeFilter }))
        }}
      />

      {/* Tariff modal */}
      <TariffModal
        client={tariffModal}
        onClose={() => setTariffModal(null)}
        onSuccess={(updated) => {
          dispatch(updateClient(updated))
          setTariffModal(null)
        }}
      />
    </div>
  )
}

function ExtendModal({ client, onClose, onSuccess }) {
  const [months, setMonths] = useState(1)
  const [loading, setLoading] = useState(false)

  if (!client) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminAPI.extendSubscription(client.id, { months })
      toast.success(`Подписка продлена на ${months} мес.`)
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка продления')
    }
    setLoading(false)
  }

  return (
    <Modal isOpen title={`Продлить: ${client.full_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Количество месяцев</label>
          <select value={months} onChange={e => setMonths(Number(e.target.value))} className="input">
            {[1, 2, 3, 6, 12].map(m => (
              <option key={m} value={m}>{m} {m === 1 ? 'месяц' : m < 5 ? 'месяца' : 'месяцев'}</option>
            ))}
          </select>
        </div>
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-sm text-blue-300">
          Платёж будет записан как бесплатное ручное продление
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? <Spinner size="sm" /> : 'Продлить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function TariffModal({ client, onClose, onSuccess }) {
  const [tariff, setTariff] = useState(client?.tariff || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setTariff(client?.tariff || '') }, [client])

  if (!client) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await adminAPI.changeTariff(client.id, tariff)
      toast.success('Тариф изменён')
      onSuccess(data.client)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка смены тарифа')
    }
    setLoading(false)
  }

  return (
    <Modal isOpen title={`Тариф: ${client.full_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Тарифный план</label>
          <select value={tariff} onChange={e => setTariff(e.target.value)} className="input">
            {TARIFFS.map(t => (
              <option key={t} value={t}>{t.replace('tariff-', '')}</option>
            ))}
          </select>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 text-sm text-yellow-300">
          ⚠️ Клиент будет переподключён с новым тарифом
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="submit" disabled={loading || tariff === client.tariff} className="btn-primary flex-1">
            {loading ? <Spinner size="sm" /> : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
