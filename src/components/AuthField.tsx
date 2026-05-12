type AuthFieldProps = {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  icon: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
};

function AuthField({ id, label, type, placeholder, icon, value, onChange, autoComplete }: AuthFieldProps) {
  return (
    <div className="auth-field">
      <label className="auth-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-field__input-wrapper">
        <input
          className="auth-field__input"
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
        />
        <span className="auth-field__icon material-symbols-outlined">{icon}</span>
      </div>
    </div>
  );
}

export default AuthField;
