import{i as k,a as $,b as t}from"./iframe-CT42YBi6.js";import"./preload-helper-C1FmrZbK.js";const o=class o extends k{constructor(){super(),this.columns=[],this.rows=[]}render(){return t`
      <table>
        <thead>
          <tr>
            ${this.columns.map(e=>t`
              <th class="th-align-${e.align||"left"}" style=${e.width?`width:${e.width}`:""}>
                ${e.label}
              </th>
            `)}
          </tr>
        </thead>
        <tbody>
          ${this.rows.map(e=>t`
            <tr>
              ${this.columns.map(l=>t`
                <td class="align-${l.align||"left"}">${e[l.key]??""}</td>
              `)}
            </tr>
          `)}
        </tbody>
      </table>
    `}};o.styles=$`
    :host { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-sm);
    }
    thead { position: sticky; top: 0; z-index: 1; }
    th {
      background: var(--color-bg-soft);
      color: var(--color-text-secondary);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: var(--font-size-xs);
      padding: var(--space-2) var(--space-3);
      text-align: left;
      white-space: nowrap;
      border-bottom: 2px solid var(--color-border);
    }
    td {
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--color-bg-hover); }
    .align-center { text-align: center; }
    .align-right { text-align: right; }
    .th-align-center { text-align: center; }
    .th-align-right { text-align: right; }

    @media (max-width: 767px) {
      th, td { padding: var(--space-1) var(--space-2); font-size: var(--font-size-xs); }
    }
  `,o.properties={columns:{type:Array},rows:{type:Array}};let s=o;customElements.define("gl-table",s);const z={title:"Table",component:"gl-table"},w=[{key:"name",label:"Họ tên"},{key:"score",label:"Điểm",align:"center"},{key:"rank",label:"Xếp loại",align:"right"}],y=[{name:"Nguyễn Văn A",score:9.5,rank:"Xuất sắc"},{name:"Trần Thị B",score:8,rank:"Giỏi"},{name:"Lê Văn C",score:6.5,rank:"Khá"},{name:"Phạm Thị D",score:5,rank:"Trung bình"}],r={render:()=>t`<gl-table .columns=${w} .rows=${y}></gl-table>`},a={render:()=>t`
    <gl-table .columns=${[{key:"name",label:"Họ tên",width:"60%"},{key:"score",label:"Điểm",align:"center",width:"20%"},{key:"rank",label:"Xếp loại",align:"right",width:"20%"}]} .rows=${y}></gl-table>
  `},n={render:()=>t`
    <gl-table .columns=${w} .rows=${Array.from({length:20},(f,e)=>({name:`Học viên ${e+1}`,score:Math.round((Math.random()*4+5)*10)/10,rank:"Khá"}))}></gl-table>
  `};var i,c,d;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:"{\n  render: () => html`<gl-table .columns=${columns} .rows=${rows}></gl-table>`\n}",...(d=(c=r.parameters)==null?void 0:c.docs)==null?void 0:d.source}}};var m,h,g;a.parameters={...a.parameters,docs:{...(m=a.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => html\`
    <gl-table .columns=\${[{
    key: 'name',
    label: 'Họ tên',
    width: '60%'
  }, {
    key: 'score',
    label: 'Điểm',
    align: 'center',
    width: '20%'
  }, {
    key: 'rank',
    label: 'Xếp loại',
    align: 'right',
    width: '20%'
  }]} .rows=\${rows}></gl-table>
  \`
}`,...(g=(h=a.parameters)==null?void 0:h.docs)==null?void 0:g.source}}};var p,b,u;n.parameters={...n.parameters,docs:{...(p=n.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => html\`
    <gl-table .columns=\${columns} .rows=\${Array.from({
    length: 20
  }, (_, i) => ({
    name: \`Học viên \${i + 1}\`,
    score: Math.round((Math.random() * 4 + 5) * 10) / 10,
    rank: 'Khá'
  }))}></gl-table>
  \`
}`,...(u=(b=n.parameters)==null?void 0:b.docs)==null?void 0:u.source}}};const M=["Default","CustomWidth","ManyRows"];export{a as CustomWidth,r as Default,n as ManyRows,M as __namedExportsOrder,z as default};
