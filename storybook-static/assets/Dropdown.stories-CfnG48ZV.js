import{i as c,a as l,b as o}from"./iframe-CT42YBi6.js";import{e as i}from"./class-map-BOhrJ1Y0.js";import{e as p,n as u}from"./ref-ETtnilHd.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";const t=class t extends c{constructor(){super(),this._menuRef=p(),this._onDocClick=e=>{this.contains(e.target)||(this.open=!1)},this.items=[],this.open=!1}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this._onDocClick)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this._onDocClick)}_toggle(){this.open=!this.open}_onItemClick(e){e.disabled||(this.open=!1,this.dispatchEvent(new CustomEvent("gl-dropdown-select",{detail:{itemId:e.id},bubbles:!0,composed:!0})))}render(){return o`
      <span class="trigger" @click=${this._toggle}>
        <slot></slot>
      </span>
      <div class="menu ${i({open:this.open})}" ${u(this._menuRef)} role="menu">
        ${this.items.map(e=>e.divider?o`<div class="divider"></div>`:o`
            <button class="item ${i({danger:!!e.danger})}" ?disabled=${e.disabled} @click=${()=>this._onItemClick(e)} role="menuitem">
              ${e.icon?o`<span class="item-icon">${e.icon}</span>`:""}
              ${e.label}
            </button>
          `)}
      </div>
    `}};t.styles=l`
    :host {
      display: inline-flex;
      position: relative;
    }
    .trigger { cursor: pointer; }
    .menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      min-width: 180px;
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-dropdown, 950);
      padding: var(--space-1);
      display: none;
      animation: drop-in 0.12s ease-out;
    }
    .menu.open { display: block; }
    .item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text);
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }
    .item:hover { background: var(--color-bg-hover); }
    .item.danger { color: var(--color-danger); }
    .item.danger:hover { background: var(--color-danger-soft); }
    .item:disabled { opacity: 0.5; cursor: default; }
    .item-icon { font-size: 1rem; flex-shrink: 0; }
    .divider {
      height: 1px;
      background: var(--color-border);
      margin: var(--space-1) 0;
    }

    @keyframes drop-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  `,t.properties={items:{type:Array},open:{type:Boolean}};let n=t;customElements.define("gl-dropdown",n);const k={title:"Dropdown",component:"gl-dropdown"},m=[{id:"edit",label:"Sửa thông tin",icon:"✏️"},{id:"duplicate",label:"Nhân bản",icon:"📋"},{id:"",label:"",divider:!0},{id:"delete",label:"Xóa",icon:"🗑️",danger:!0}],r={render:()=>o`
    <gl-dropdown .items=${m}>
      <button style="padding:8px 16px;border:1px solid var(--color-border);border-radius:6px;background:none;cursor:pointer;">
        Actions ▾
      </button>
    </gl-dropdown>
  `};var s,a,d;r.parameters={...r.parameters,docs:{...(s=r.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: () => html\`
    <gl-dropdown .items=\${items}>
      <button style="padding:8px 16px;border:1px solid var(--color-border);border-radius:6px;background:none;cursor:pointer;">
        Actions ▾
      </button>
    </gl-dropdown>
  \`
}`,...(d=(a=r.parameters)==null?void 0:a.docs)==null?void 0:d.source}}};const x=["Default"];export{r as Default,x as __namedExportsOrder,k as default};
