import{i as b,a as v,b as r}from"./iframe-CT42YBi6.js";import"./preload-helper-C1FmrZbK.js";const a=class a extends b{constructor(){super(),this.color="default",this.removable=!1}_onRemove(m){m.stopPropagation(),this.dispatchEvent(new CustomEvent("gl-chip-remove",{bubbles:!0,composed:!0}))}render(){return r`
      <span class="chip chip-${this.color}" @click=${()=>this.dispatchEvent(new CustomEvent("gl-chip-click",{bubbles:!0,composed:!0}))}>
        <slot></slot>
        ${this.removable?r`<button class="remove-btn" @click=${this._onRemove} aria-label="Xoá">×</button>`:""}
      </span>
    `}};a.styles=v`
    :host { display: inline-flex; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 2px 10px;
      font-size: var(--font-size-xs);
      font-weight: 700;
      border-radius: var(--radius-full);
      white-space: nowrap;
      cursor: default;
      border: 1px solid transparent;
    }
    .chip-default { background: var(--color-bg-hover); color: var(--color-text-secondary); border-color: var(--color-border); }
    .chip-primary { background: var(--color-primary-soft); color: var(--color-primary); }
    .chip-success { background: var(--color-success-soft); color: var(--color-success); }
    .chip-danger { background: var(--color-danger-soft); color: var(--color-danger); }
    .chip-warn { background: #fff7ed; color: #ea580c; }
    .remove-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border-radius: var(--radius-full);
      border: none;
      background: none;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
      padding: 0;
      color: inherit;
      opacity: 0.6;
    }
    .remove-btn:hover { opacity: 1; }
    .clickable { cursor: pointer; }
    .clickable:hover { filter: brightness(0.92); }
  `,a.properties={color:{type:String},removable:{type:Boolean}};let l=a;customElements.define("gl-chip",l);const x={title:"Chip",component:"gl-chip",argTypes:{color:{control:"select",options:["default","primary","success","danger","warn"]},removable:{control:"boolean"}},args:{color:"default",removable:!1}},e={render:()=>r`<gl-chip color="primary">Giỏi</gl-chip>`},o={render:()=>r`
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      <gl-chip color="default">Default</gl-chip>
      <gl-chip color="primary">Primary</gl-chip>
      <gl-chip color="success">Success</gl-chip>
      <gl-chip color="danger">Danger</gl-chip>
      <gl-chip color="warn">Warn</gl-chip>
    </div>
  `},c={render:()=>r`<gl-chip color="primary" removable>Lọc: Giỏi</gl-chip>`};var i,s,t;e.parameters={...e.parameters,docs:{...(i=e.parameters)==null?void 0:i.docs,source:{originalSource:'{\n  render: () => html`<gl-chip color="primary">Giỏi</gl-chip>`\n}',...(t=(s=e.parameters)==null?void 0:s.docs)==null?void 0:t.source}}};var n,p,d;o.parameters={...o.parameters,docs:{...(n=o.parameters)==null?void 0:n.docs,source:{originalSource:`{
  render: () => html\`
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      <gl-chip color="default">Default</gl-chip>
      <gl-chip color="primary">Primary</gl-chip>
      <gl-chip color="success">Success</gl-chip>
      <gl-chip color="danger">Danger</gl-chip>
      <gl-chip color="warn">Warn</gl-chip>
    </div>
  \`
}`,...(d=(p=o.parameters)==null?void 0:p.docs)==null?void 0:d.source}}};var g,h,u;c.parameters={...c.parameters,docs:{...(g=c.parameters)==null?void 0:g.docs,source:{originalSource:'{\n  render: () => html`<gl-chip color="primary" removable>Lọc: Giỏi</gl-chip>`\n}',...(u=(h=c.parameters)==null?void 0:h.docs)==null?void 0:u.source}}};const w=["Default","AllColors","Removable"];export{o as AllColors,e as Default,c as Removable,w as __namedExportsOrder,x as default};
