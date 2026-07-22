import{i as c,a as p,b as l}from"./iframe-CT42YBi6.js";import"./preload-helper-C1FmrZbK.js";const t=class t extends c{constructor(){super(),this.label="",this.value="",this.placeholder="Chọn...",this.disabled=!1,this.options=[]}_onChange(e){const r=e.target;this.value=r.value,this.dispatchEvent(new CustomEvent("gl-change",{detail:{value:r.value},bubbles:!0,composed:!0}))}render(){return l`
      <div class="field">
        ${this.label?l`<label class="field-label">${this.label}</label>`:""}
        <div class="select-wrap">
          <select
            class="select"
            .value=${this.value}
            ?disabled=${this.disabled}
            @change=${this._onChange}
          >
            ${this.placeholder?l`<option value="">${this.placeholder}</option>`:""}
            ${this.options.map(e=>l`
              <option value=${e.value} ?selected=${e.value===this.value}>${e.label}</option>
            `)}
          </select>
          <span class="select-arrow">▼</span>
        </div>
      </div>
    `}};t.styles=p`
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
    .select-wrap { position: relative; }
    .select {
      width: 100%;
      min-height: var(--touch-target-min);
      padding: var(--space-2) var(--space-10) var(--space-2) var(--space-3);
      font-family: inherit;
      font-size: var(--font-size-base);
      color: var(--color-text);
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      appearance: none;
      outline: none;
      cursor: pointer;
      transition: border-color var(--duration-fast);
      box-sizing: border-box;
    }
    .select:hover { border-color: var(--color-border-strong); }
    .select:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .select-arrow {
      position: absolute;
      right: var(--space-3);
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--color-text-muted);
    }
  `,t.properties={label:{type:String},value:{type:String},placeholder:{type:String},disabled:{type:Boolean},options:{type:Array}};let o=t;customElements.define("gl-select",o);const u={title:"Select",component:"gl-select",argTypes:{label:{control:"text"},placeholder:{control:"text"},disabled:{control:"boolean"}},args:{label:"Xếp loại",placeholder:"Chọn xếp loại...",disabled:!1}},a={render:()=>l`
    <gl-select
      label="Xếp loại"
      placeholder="Chọn..."
      .options=${[{value:"all",label:"Tất cả"},{value:"xs",label:"Xuất sắc"},{value:"g",label:"Giỏi"},{value:"k",label:"Khá"},{value:"tb",label:"Trung bình"},{value:"y",label:"Yếu"}]}
    ></gl-select>
  `};var s,i,n;a.parameters={...a.parameters,docs:{...(s=a.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: () => html\`
    <gl-select
      label="Xếp loại"
      placeholder="Chọn..."
      .options=\${[{
    value: 'all',
    label: 'Tất cả'
  }, {
    value: 'xs',
    label: 'Xuất sắc'
  }, {
    value: 'g',
    label: 'Giỏi'
  }, {
    value: 'k',
    label: 'Khá'
  }, {
    value: 'tb',
    label: 'Trung bình'
  }, {
    value: 'y',
    label: 'Yếu'
  }]}
    ></gl-select>
  \`
}`,...(n=(i=a.parameters)==null?void 0:i.docs)==null?void 0:n.source}}};const v=["Default"];export{a as Default,v as __namedExportsOrder,u as default};
