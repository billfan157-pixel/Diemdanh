import{i as l,a as d,b as a}from"./iframe-CT42YBi6.js";import{e as c}from"./class-map-BOhrJ1Y0.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";const t=class t extends l{constructor(){super(),this.items=[],this.activeId="",this.header=""}_onItemClick(e){this.dispatchEvent(new CustomEvent("gl-sidebar-select",{detail:{itemId:e},bubbles:!0,composed:!0}))}render(){return a`
      ${this.header?a`<div class="header">${this.header}</div>`:""}
      <nav class="nav">
        ${this.items.map(e=>e.id==="__section"?a`<div class="section-label">${e.label}</div>`:a`
            <button
              class="item ${c({active:e.id===this.activeId})}"
              @click=${()=>this._onItemClick(e.id)}
              ?disabled=${e.id==="__spacer"}
            >
              <span class="item-icon">${e.icon}</span>
              <span class="item-label">${e.label}</span>
              ${e.badge?a`<span class="item-badge">${e.badge>99?"99+":e.badge}</span>`:""}
            </button>
          `)}
      </nav>
      <slot name="footer"></slot>
    `}};t.styles=d`
    :host {
      display: flex;
      flex-direction: column;
      width: var(--sidebar-width, 260px);
      height: 100%;
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border-right: 1px solid var(--glass-border);
      overflow-y: auto;
      transition: width var(--duration-normal) var(--easing-standard);
    }
    .header {
      padding: var(--space-5) var(--space-4) var(--space-3);
      font-family: var(--font-family-display);
      font-size: var(--font-size-xs);
      font-weight: 800;
      color: var(--color-gold);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1px solid var(--glass-border);
    }
    .nav { flex: 1; padding: var(--space-3) var(--space-2); }
    .item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-3);
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      font-weight: 600;
      border: 1px solid transparent;
      background: none;
      width: 100%;
      text-align: left;
      transition: all var(--duration-fast) var(--easing-standard);
      position: relative;
    }
    .item:hover {
      background: var(--color-bg-hover);
      color: var(--color-text);
      transform: translateX(2px);
    }
    .item.active {
      background: var(--color-primary-soft);
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 25%, transparent);
      font-weight: 700;
    }
    .item.active::before {
      content: '';
      position: absolute;
      left: -2px;
      top: 20%;
      bottom: 20%;
      width: 4px;
      background: var(--color-primary);
      border-radius: 4px;
    }
    .item-icon { font-size: 1.15rem; flex-shrink: 0; }
    .item-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item-badge {
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      background: var(--color-danger);
      color: white;
      font-size: 10px;
      font-weight: 800;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    }
    .section-label {
      padding: var(--space-4) var(--space-3) var(--space-1);
      font-size: 10px;
      font-weight: 800;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    @media (max-width: 767px) {
      :host {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: var(--z-drawer, 1000);
        box-shadow: var(--shadow-xl);
        transform: translateX(-100%);
        transition: transform var(--duration-normal) var(--easing-standard);
      }
      :host(.open) { transform: translateX(0); }
    }
  `,t.properties={items:{type:Array},activeId:{type:String},header:{type:String}};let s=t;customElements.define("gl-sidebar",s);const h={title:"Sidebar",component:"gl-sidebar"},p=[{id:"__section",label:"Điều hướng",icon:""},{id:"dashboard",label:"Tổng quan",icon:"📊"},{id:"classes",label:"Lớp học",icon:"📚",badge:3},{id:"reports",label:"Báo cáo",icon:"📋"},{id:"__section",label:"Cá nhân",icon:""},{id:"profile",label:"Hồ sơ",icon:"👤"},{id:"settings",label:"Cài đặt",icon:"⚙️"}],r={render:()=>a`<gl-sidebar header="Sổ Điểm GL" .items=${p} activeId="classes"></gl-sidebar>`};var o,i,n;r.parameters={...r.parameters,docs:{...(o=r.parameters)==null?void 0:o.docs,source:{originalSource:'{\n  render: () => html`<gl-sidebar header="Sổ Điểm GL" .items=${items} activeId="classes"></gl-sidebar>`\n}',...(n=(i=r.parameters)==null?void 0:i.docs)==null?void 0:n.source}}};const f=["Default"];export{r as Default,f as __namedExportsOrder,h as default};
