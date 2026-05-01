import React, { useState, useCallback } from 'react';
import './App.css';

// --------------------------------------------------------------
// Депозитний калькулятор (капіталізація після податку)
// --------------------------------------------------------------
const calculateDeposit = (amount, ratePercent, years, hasCapitalization, frequency) => {
  const P = parseFloat(amount);
  const r = parseFloat(ratePercent) / 100;   // номінальна річна ставка
  const t = parseFloat(years);
  const n = hasCapitalization ? parseInt(frequency) : 1;

  if (isNaN(P) || isNaN(r) || isNaN(t) || P <= 0 || r <= 0 || t <= 0) {
    return { total: 0, income: 0, tax: 0 };
  }

  // Сума без урахування податку (брутто)
  let S_brut;
  if (hasCapitalization) {
    S_brut = P * Math.pow(1 + r / n, n * t);
  } else {
    S_brut = P * (1 + r * t);
  }

  const taxRate = 0.23;                // 23% згідно з наданими прикладами
  const r_net = r * (1 - taxRate);     // ставка після оподаткування

  let S_net;
  if (hasCapitalization) {
    S_net = P * Math.pow(1 + r_net / n, n * t);
  } else {
    S_net = P * (1 + r_net * t);
  }

  const income = S_net - P;
  const tax = S_brut - S_net;          // різниця між брутто і нетто

  return { total: S_net, income: income, tax: tax };
};

// --------------------------------------------------------------
// Кредитний калькулятор (з округленням до копійок)
// --------------------------------------------------------------
const generateLoanSchedule = (productPrice, ownFunds, years, ratePercent, oneTimeCommissionPercent, monthlyCommissionFixed, method) => {
  let loanAmount = productPrice - ownFunds;
  if (loanAmount <= 0) return { schedule: [], totalPaid: 0, totalInterestCommissions: 0 };

  const oneTimeCommission = loanAmount * (oneTimeCommissionPercent / 100);
  const monthlyRate = (parseFloat(ratePercent) / 100) / 12;
  const months = years * 12;
  const monthlyCommission = parseFloat(monthlyCommissionFixed) || 0;

  let schedule = [];
  let totalPaid = 0;
  let totalInterest = 0;
  let remainingDebt = loanAmount;

  // Допоміжна функція округлення до 2 знаків
  const round = (value) => Math.round(value * 100) / 100;

  if (method === 'annuity') {
    // Коефіцієнт ануїтету
    const annuityFactor = (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    let annuityPayment = round(loanAmount * annuityFactor);

    for (let i = 1; i <= months; i++) {
      const interestPayment = round(remainingDebt * monthlyRate);
      let principalPayment = round(annuityPayment - interestPayment);
      // Коригування останнього платежу, щоб залишок став нулем
      if (i === months) {
        principalPayment = remainingDebt;
        annuityPayment = round(principalPayment + interestPayment);
      }
      let totalMonthlyPayment = round(annuityPayment + monthlyCommission);
      if (i === 1) totalMonthlyPayment = round(totalMonthlyPayment + oneTimeCommission);

      totalInterest += interestPayment;
      totalPaid += totalMonthlyPayment;
      schedule.push({
        month: i,
        debt: round(remainingDebt),
        principalRepayment: principalPayment,
        interest: interestPayment,
        commission: monthlyCommission,
        monthlyPayment: totalMonthlyPayment,
      });
      remainingDebt = round(remainingDebt - principalPayment);
      if (remainingDebt < 0) remainingDebt = 0;
    }
  } else { // диференційований
    const fixedPrincipalPayment = round(loanAmount / months);
    for (let i = 1; i <= months; i++) {
      const interestPayment = round(remainingDebt * monthlyRate);
      let totalMonthlyPayment = round(fixedPrincipalPayment + interestPayment + monthlyCommission);
      if (i === 1) totalMonthlyPayment = round(totalMonthlyPayment + oneTimeCommission);

      totalInterest += interestPayment;
      totalPaid += totalMonthlyPayment;
      schedule.push({
        month: i,
        debt: round(remainingDebt),
        principalRepayment: fixedPrincipalPayment,
        interest: interestPayment,
        commission: monthlyCommission,
        monthlyPayment: totalMonthlyPayment,
      });
      remainingDebt = round(remainingDebt - fixedPrincipalPayment);
      if (remainingDebt < 0) remainingDebt = 0;
    }
  }

  const totalInterestCommissions = round(totalInterest + (monthlyCommission * months) + oneTimeCommission);
  const totalPaidRounded = round(totalPaid);
  return { schedule, totalPaid: totalPaidRounded, totalInterestCommissions };
};

// --------------------------------------------------------------
// Компонент депозитного калькулятора
// --------------------------------------------------------------
const DepositCalculator = ({ values, onValueChange, onCalculate, result, onClear }) => {
  const frequencies = [
    { label: 'щоденно (365 разів на рік)', value: 365 },
    { label: 'щомісяця (12 разів на рік)', value: 12 },
    { label: 'щокварталу (4 рази на рік)', value: 4 },
    { label: 'щопівроку (2 рази на рік)', value: 2 },
    { label: 'щороку (1 раз на рік)', value: 1 },
  ];

  return (
    <div className="calculator-card">
      <h2>Депозитний калькулятор</h2>
      <div className="form-group">
        <label>Початкова сума вкладу</label>
        <input type="number" value={values.amount} onChange={(e) => onValueChange('amount', e.target.value)} step="any" />
        <span className="unit">грн</span>
      </div>
      <div className="form-group">
        <label>Річна ставка за депозитом</label>
        <input type="number" value={values.rate} onChange={(e) => onValueChange('rate', e.target.value)} step="any" />
        <span className="unit">%</span>
      </div>
      <div className="form-group">
        <label>Строк розміщення коштів</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            value={values.termValue}
            onChange={(e) => onValueChange('termValue', e.target.value)}
            step="any"
            style={{ flex: 1 }}
          />
          <select
            value={values.termUnit}
            onChange={(e) => onValueChange('termUnit', e.target.value)}
            style={{ width: '100px' }}
          >
            <option value="years">років</option>
            <option value="months">місяців</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Капіталізація відсотків</label>
        <select value={values.capitalization ? 'так' : 'ні'} onChange={(e) => onValueChange('capitalization', e.target.value === 'так')}>
          <option value="так">так</option>
          <option value="ні">ні</option>
        </select>
      </div>
      {values.capitalization && (
        <div className="form-group">
          <label>Періодичність нарахування відсотків</label>
          <select value={values.frequency} onChange={(e) => onValueChange('frequency', parseInt(e.target.value))}>
            {frequencies.map(freq => (
              <option key={freq.value} value={freq.value}>{freq.label}</option>
            ))}
          </select>
        </div>
      )}
      <div className="button-group">
        <button onClick={onClear} className="btn-secondary">Очистити</button>
        <button onClick={onCalculate} className="btn-primary">Порахувати</button>
      </div>
      {result.total > 0 && (
        <div className="result-section">
          <div className="result-item">
            <span>Сума до повернення вкладнику після завершення строку депозитної угоди</span>
            <strong>{result.total.toFixed(2)} грн</strong>
          </div>
          <div className="result-item">
            <span>Дохід вкладника</span>
            <strong>{result.income.toFixed(2)} грн</strong>
          </div>
          <div className="result-item">
            <span>Сплачені податки</span>
            <strong>{result.tax.toFixed(2)} грн</strong>
          </div>
        </div>
      )}
    </div>
  );
};

// --------------------------------------------------------------
// Компонент кредитного калькулятора (виправлена таблиця)
// --------------------------------------------------------------
const CreditCalculator = ({ values, onValueChange, onCalculate, scheduleData, totalPaid, totalInterestCommissions, onClear }) => {
  return (
    <div className="calculator-card">
      <h2>Кредитний калькулятор</h2>
      <div className="form-row">
        <div className="form-group">
          <label>Ціна товару</label>
          <input type="number" value={values.price} onChange={(e) => onValueChange('price', e.target.value)} step="any" />
          <span className="unit">грн</span>
        </div>
        <div className="form-group">
          <label>Власні кошти (заощадження)</label>
          <input type="number" value={values.ownFunds} onChange={(e) => onValueChange('ownFunds', e.target.value)} step="any" />
          <span className="unit">грн</span>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Строк кредитування</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              value={values.termValue}
              onChange={(e) => onValueChange('termValue', e.target.value)}
              step="any"
              style={{ flex: 1 }}
            />
            <select
              value={values.termUnit}
              onChange={(e) => onValueChange('termUnit', e.target.value)}
              style={{ width: '100px' }}
            >
              <option value="years">років</option>
              <option value="months">місяців</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Відсоткова ставка за кредитом</label>
          <input type="number" value={values.rate} onChange={(e) => onValueChange('rate', e.target.value)} step="any" />
          <span className="unit">% річних</span>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Разова комісія</label>
          <input type="number" value={values.oneTimeCommission} onChange={(e) => onValueChange('oneTimeCommission', e.target.value)} step="any" />
          <span className="unit">%</span>
        </div>
        <div className="form-group">
          <label>Щомісячна комісія</label>
          <input type="number" value={values.monthlyCommission} onChange={(e) => onValueChange('monthlyCommission', e.target.value)} step="any" />
          <span className="unit">грн</span>
        </div>
      </div>
      <div className="form-group">
        <label>Метод погашення кредиту</label>
        <select value={values.method} onChange={(e) => onValueChange('method', e.target.value)}>
          <option value="annuity">ануїтетний (рівні платежі)</option>
          <option value="differential">стандартний (диференційований)</option>
        </select>
      </div>
      <div className="button-group">
        <button onClick={onClear} className="btn-secondary">Очистити</button>
        <button onClick={onCalculate} className="btn-primary">Порахувати</button>
      </div>

      {scheduleData.length > 0 && (
        <div className="loan-result">
          <div className="loan-summary">
            <div>Усього сплачено за кредитом: <strong>{totalPaid.toFixed(2)} грн</strong></div>
            <div>У тому числі сплачено процентів та комісій: <strong>{totalInterestCommissions.toFixed(2)} грн</strong></div>
          </div>
          <div className="table-wrapper">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Місяць</th>
                  <th>Заборгованість, грн</th>
                  <th>Погашення кредиту, грн</th>
                  <th>Відсотки, грн</th>
                  <th>Комісії, грн</th>
                  <th>Виплата в місяць, грн</th>
                </tr>
              </thead>
              <tbody>
                {scheduleData.map(row => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td>{row.debt.toFixed(2)}</td>
                    <td>{row.principalRepayment.toFixed(2)}</td>
                    <td>{row.interest.toFixed(2)}</td>
                    <td>{row.commission.toFixed(2)}</td>
                    <td>{row.monthlyPayment.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// --------------------------------------------------------------
// Калькулятор інфляції (додатковий інструмент)
// --------------------------------------------------------------
const InflationCalculator = () => {
  const [amount, setAmount] = useState(10000);
  const [inflationRate, setInflationRate] = useState(10);
  const [years, setYears] = useState(1);
  const [realValue, setRealValue] = useState(null);
  const [purchasingLoss, setPurchasingLoss] = useState(null);

  const calculateInflation = useCallback(() => {
    const principal = parseFloat(amount);
    const rate = parseFloat(inflationRate) / 100;
    const period = parseFloat(years);
    if (principal > 0 && rate > 0 && period > 0) {
      const futureRealValue = principal / Math.pow(1 + rate, period);
      const loss = principal - futureRealValue;
      setRealValue(futureRealValue);
      setPurchasingLoss(loss);
    } else {
      setRealValue(null);
      setPurchasingLoss(null);
    }
  }, [amount, inflationRate, years]);

  const handleClear = () => {
    setAmount(10000);
    setInflationRate(10);
    setYears(1);
    setRealValue(null);
    setPurchasingLoss(null);
  };

  return (
    <div className="calculator-card">
      <h2>Калькулятор інфляції (втрата купівельної спроможності)</h2>
      <div className="form-group">
        <label>Початкова сума (грн)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="any" />
      </div>
      <div className="form-group">
        <label>Річна інфляція (%)</label>
        <input type="number" value={inflationRate} onChange={(e) => setInflationRate(e.target.value)} step="any" />
      </div>
      <div className="form-group">
        <label>Кількість років</label>
        <input type="number" value={years} onChange={(e) => setYears(e.target.value)} step="any" />
      </div>
      <div className="button-group">
        <button onClick={handleClear} className="btn-secondary">Очистити</button>
        <button onClick={calculateInflation} className="btn-primary">Порахувати</button>
      </div>
      {realValue !== null && (
        <div className="result-section">
          <div className="result-item"><span>Реальна вартість через {years} років</span><strong>{realValue.toFixed(2)} грн</strong></div>
          <div className="result-item"><span>Втрата купівельної спроможності</span><strong>{purchasingLoss.toFixed(2)} грн</strong></div>
        </div>
      )}
    </div>
  );
};

// --------------------------------------------------------------
// Головний додаток (SPA)
// --------------------------------------------------------------
const App = () => {
  const [activeTab, setActiveTab] = useState('deposit');

  // Депозит
  const [depositValues, setDepositValues] = useState({
    amount: '',
    rate: '',
    termValue: '',
    termUnit: 'years',
    capitalization: true,
    frequency: 12,
  });
  const [depositResult, setDepositResult] = useState({ total: 0, income: 0, tax: 0 });

  // Кредит
  const [creditValues, setCreditValues] = useState({
    price: '',
    ownFunds: '',
    termValue: '',
    termUnit: 'years',
    rate: '',
    oneTimeCommission: '0',
    monthlyCommission: '0',
    method: 'annuity',
  });
  const [creditSchedule, setCreditSchedule] = useState([]);
  const [creditTotalPaid, setCreditTotalPaid] = useState(0);
  const [creditTotalInterestCommissions, setCreditTotalInterestCommissions] = useState(0);

  const handleDepositChange = (field, value) => setDepositValues(prev => ({ ...prev, [field]: value }));
  const handleDepositCalculate = () => {
    let years = parseFloat(depositValues.termValue);
    if (depositValues.termUnit === 'months') {
      years = years / 12;
    }
    const res = calculateDeposit(
      depositValues.amount,
      depositValues.rate,
      years,
      depositValues.capitalization,
      depositValues.frequency
    );
    setDepositResult(res);
  };
  const handleDepositClear = () => {
    setDepositValues({
      amount: '',
      rate: '',
      termValue: '',
      termUnit: 'years',
      capitalization: true,
      frequency: 12,
    });
    setDepositResult({ total: 0, income: 0, tax: 0 });
  };

  const handleCreditChange = (field, value) => setCreditValues(prev => ({ ...prev, [field]: value }));
  const handleCreditCalculate = () => {
    let years = parseFloat(creditValues.termValue);
    if (creditValues.termUnit === 'months') {
      years = years / 12;
    }
    const { schedule, totalPaid, totalInterestCommissions } = generateLoanSchedule(
      parseFloat(creditValues.price),
      parseFloat(creditValues.ownFunds),
      years,
      parseFloat(creditValues.rate),
      parseFloat(creditValues.oneTimeCommission),
      parseFloat(creditValues.monthlyCommission),
      creditValues.method
    );
    setCreditSchedule(schedule);
    setCreditTotalPaid(totalPaid);
    setCreditTotalInterestCommissions(totalInterestCommissions);
  };
  const handleCreditClear = () => {
    setCreditValues({
      price: '',
      ownFunds: '',
      termValue: '',
      termUnit: 'years',
      rate: '',
      oneTimeCommission: '0',
      monthlyCommission: '0',
      method: 'annuity',
    });
    setCreditSchedule([]);
    setCreditTotalPaid(0);
    setCreditTotalInterestCommissions(0);
  };

  return (
    <div className="app-container">
      <header>
        <h1>Фінансовий помічник</h1>
        <div className="tabs">
          <button className={activeTab === 'deposit' ? 'tab-active' : ''} onClick={() => setActiveTab('deposit')}>Депозитний калькулятор</button>
          <button className={activeTab === 'credit' ? 'tab-active' : ''} onClick={() => setActiveTab('credit')}>Кредитний калькулятор</button>
          <button className={activeTab === 'inflation' ? 'tab-active' : ''} onClick={() => setActiveTab('inflation')}>Калькулятор інфляції</button>
        </div>
      </header>
      <main>
        {activeTab === 'deposit' && (
          <DepositCalculator
            values={depositValues}
            onValueChange={handleDepositChange}
            onCalculate={handleDepositCalculate}
            result={depositResult}
            onClear={handleDepositClear}
          />
        )}
        {activeTab === 'credit' && (
          <CreditCalculator
            values={creditValues}
            onValueChange={handleCreditChange}
            onCalculate={handleCreditCalculate}
            scheduleData={creditSchedule}
            totalPaid={creditTotalPaid}
            totalInterestCommissions={creditTotalInterestCommissions}
            onClear={handleCreditClear}
          />
        )}
        {activeTab === 'inflation' && <InflationCalculator />}
      </main>
      <footer>
        <p>Розрахунки депозиту: податок 23%, капіталізація після оподаткування. Кредит: стандартні формули (ануїтет/диференційований), разова комісія додається до першого платежу.</p>
      </footer>
    </div>
  );
};

export default App;