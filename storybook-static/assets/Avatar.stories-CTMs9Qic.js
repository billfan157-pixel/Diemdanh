import{i as u,a as f,b as a}from"./iframe-CT42YBi6.js";import"./preload-helper-C1FmrZbK.js";const s=class s extends u{constructor(){super(),this.size="md",this.src="",this.name=""}_getInitials(){return this.name?this.name.split(" ").filter(Boolean).slice(0,2).map(h=>h.charAt(0).toUpperCase()).join(""):"?"}render(){return this.src?a`<div class="avatar avatar-${this.size}"><img src=${this.src} alt=${this.name}></div>`:a`<div class="avatar avatar-${this.size}" aria-label=${this.name}>${this._getInitials()}</div>`}};s.styles=f`
    :host { display: inline-flex; }
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-full);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-weight: 800;
      flex-shrink: 0;
      overflow: hidden;
      user-select: none;
    }
    .avatar-sm { width: 32px; height: 32px; font-size: var(--font-size-xs); }
    .avatar-md { width: 40px; height: 40px; font-size: var(--font-size-sm); }
    .avatar-lg { width: 48px; height: 48px; font-size: var(--font-size-base); }
    .avatar-xl { width: 64px; height: 64px; font-size: var(--font-size-lg); }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,s.properties={size:{type:String},src:{type:String},name:{type:String}};let i=s;customElements.define("gl-avatar",i);const y={title:"Avatar",component:"gl-avatar",argTypes:{size:{control:"select",options:["sm","md","lg","xl"]},name:{control:"text"},src:{control:"text"}},args:{size:"md",name:"Nguyễn Văn A",src:""}},e={render:()=>a`<gl-avatar name="Nguyễn Văn A"></gl-avatar>`},t={render:()=>a`
    <div style="display:flex;align-items:center;gap:12px;">
      <gl-avatar size="sm" name="A"></gl-avatar>
      <gl-avatar size="md" name="B"></gl-avatar>
      <gl-avatar size="lg" name="C"></gl-avatar>
      <gl-avatar size="xl" name="D"></gl-avatar>
    </div>
  `},r={render:()=>a`<gl-avatar name="Admin"></gl-avatar>`};var n,l,o;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:'{\n  render: () => html`<gl-avatar name="Nguyễn Văn A"></gl-avatar>`\n}',...(o=(l=e.parameters)==null?void 0:l.docs)==null?void 0:o.source}}};var m,g,c;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => html\`
    <div style="display:flex;align-items:center;gap:12px;">
      <gl-avatar size="sm" name="A"></gl-avatar>
      <gl-avatar size="md" name="B"></gl-avatar>
      <gl-avatar size="lg" name="C"></gl-avatar>
      <gl-avatar size="xl" name="D"></gl-avatar>
    </div>
  \`
}`,...(c=(g=t.parameters)==null?void 0:g.docs)==null?void 0:c.source}}};var d,v,p;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:'{\n  render: () => html`<gl-avatar name="Admin"></gl-avatar>`\n}',...(p=(v=r.parameters)==null?void 0:v.docs)==null?void 0:p.source}}};const S=["Initials","Sizes","SingleName"];export{e as Initials,r as SingleName,t as Sizes,S as __namedExportsOrder,y as default};
