import{i as S,a as q,b as e}from"./iframe-CT42YBi6.js";import{e as w}from"./class-map-BOhrJ1Y0.js";import{o}from"./if-defined-D_MhRTYw.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";const s=class s extends S{constructor(){super(),this.label="",this.type="text",this.placeholder="",this.value="",this.disabled=!1,this.readonly=!1,this.required=!1,this.error="",this.hint="",this.name="",this.inputmode="",this.autocomplete=""}_onInput(t){const p=t.target;this.value=p.value,this.dispatchEvent(new CustomEvent("gl-change",{detail:{value:p.value},bubbles:!0,composed:!0}))}_onFocus(t){this.dispatchEvent(new CustomEvent("gl-focus",{detail:{target:t.target},bubbles:!0,composed:!0}))}_onBlur(t){this.dispatchEvent(new CustomEvent("gl-blur",{detail:{target:t.target},bubbles:!0,composed:!0}))}render(){const t={input:!0,"input-error":!!this.error};return e`
      <div class="field">
        ${this.label?e`<label class="field-label" for="input">${this.label}</label>`:""}
        <input
          id="input"
          class=${w(t)}
          type=${this.type}
          .value=${this.value}
          placeholder=${o(this.placeholder||void 0)}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          name=${o(this.name||void 0)}
          inputmode=${o(this.inputmode||void 0)}
          autocomplete=${o(this.autocomplete||void 0)}
          aria-invalid=${this.error?"true":"false"}
          aria-describedby=${this.error?"hint":void 0}
          @input=${this._onInput}
          @focus=${this._onFocus}
          @blur=${this._onBlur}
        />
        ${this.error?e`<span class="hint hint-error" id="hint">${this.error}</span>`:""}
        ${this.hint&&!this.error?e`<span class="hint">${this.hint}</span>`:""}
      </div>
    `}};s.styles=q`
    :host { display: block; }
    .field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .field-label {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .input {
      width: 100%;
      min-height: var(--touch-target-min);
      padding: var(--space-2) var(--space-3);
      font-family: inherit;
      font-size: var(--font-size-base);
      line-height: 1.5;
      color: var(--color-text);
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
      box-sizing: border-box;
    }
    .input::placeholder { color: var(--color-text-muted-2); }
    .input:hover { border-color: var(--color-border-strong); }
    .input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .input:disabled {
      background: var(--color-bg-hover);
      color: var(--color-text-muted);
      cursor: not-allowed;
    }
    .input-error {
      border-color: var(--color-danger);
    }
    .input-error:focus {
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
    }
    .hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .hint-error {
      color: var(--color-danger);
    }
  `,s.properties={label:{type:String},type:{type:String},placeholder:{type:String},value:{type:String},disabled:{type:Boolean},readonly:{type:Boolean},required:{type:Boolean},error:{type:String,reflect:!0},hint:{type:String},name:{type:String},inputmode:{type:String},autocomplete:{type:String}};let d=s;customElements.define("gl-input",d);const D={title:"Input",component:"gl-input",argTypes:{type:{control:"select",options:["text","password","email","number","tel","search"]},disabled:{control:"boolean"},required:{control:"boolean"},error:{control:"text"},hint:{control:"text"},label:{control:"text"},placeholder:{control:"text"}},args:{label:"Họ tên",type:"text",placeholder:"Nhập họ tên...",disabled:!1,required:!1,error:"",hint:""}},a={render:r=>e`
    <gl-input
      label=${r.label}
      type=${r.type}
      placeholder=${r.placeholder}
      ?disabled=${r.disabled}
      ?required=${r.required}
      error=${r.error}
      hint=${r.hint}
    ></gl-input>
  `},i={render:()=>e`
    <gl-input
      label="Email"
      type="email"
      placeholder="email@example.com"
      error="Email không hợp lệ"
      required
    ></gl-input>
  `},l={render:()=>e`
    <gl-input
      label="Mật khẩu"
      type="password"
      placeholder="••••••"
      hint="Ít nhất 6 ký tự"
    ></gl-input>
  `},n={render:()=>e`
    <gl-input
      label="Tài khoản"
      value="admin"
      disabled
    ></gl-input>
  `};var c,u,h;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  render: args => html\`
    <gl-input
      label=\${args.label}
      type=\${args.type}
      placeholder=\${args.placeholder}
      ?disabled=\${args.disabled}
      ?required=\${args.required}
      error=\${args.error}
      hint=\${args.hint}
    ></gl-input>
  \`
}`,...(h=(u=a.parameters)==null?void 0:u.docs)==null?void 0:h.source}}};var m,b,g;i.parameters={...i.parameters,docs:{...(m=i.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => html\`
    <gl-input
      label="Email"
      type="email"
      placeholder="email@example.com"
      error="Email không hợp lệ"
      required
    ></gl-input>
  \`
}`,...(g=(b=i.parameters)==null?void 0:b.docs)==null?void 0:g.source}}};var v,y,f;l.parameters={...l.parameters,docs:{...(v=l.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => html\`
    <gl-input
      label="Mật khẩu"
      type="password"
      placeholder="••••••"
      hint="Ít nhất 6 ký tự"
    ></gl-input>
  \`
}`,...(f=(y=l.parameters)==null?void 0:y.docs)==null?void 0:f.source}}};var $,x,E;n.parameters={...n.parameters,docs:{...($=n.parameters)==null?void 0:$.docs,source:{originalSource:`{
  render: () => html\`
    <gl-input
      label="Tài khoản"
      value="admin"
      disabled
    ></gl-input>
  \`
}`,...(E=(x=n.parameters)==null?void 0:x.docs)==null?void 0:E.source}}};const W=["Default","WithError","WithHint","Disabled"];export{a as Default,n as Disabled,i as WithError,l as WithHint,W as __namedExportsOrder,D as default};
