/**
 * Krathong Vector SVG Generator
 * Generates custom, crisp vector illustrations of Krathongs with layered shading & warm candle light
 */
const KrathongArt = (function () {
  let svgCounter = 0;

  // Color themes and SVG definitions
  const BASES = {
    banana_leaf: {
      name: 'กระทงใบตอง',
      desc: 'กระทงใบตองจับจีบแบบดั้งเดิม',
      render: (uid) => `
        <g id="banana-base">
          <ellipse cx="100" cy="133" rx="88" ry="31" fill="#0f291e" opacity="0.55"/>
          ${[
            { cx: 30, cy: 122, rot: -38 },
            { cx: 50, cy: 132, rot: -22 },
            { cx: 75, cy: 138, rot: -10 },
            { cx: 100, cy: 140, rot: 0 },
            { cx: 125, cy: 138, rot: 10 },
            { cx: 150, cy: 132, rot: 22 },
            { cx: 170, cy: 122, rot: 38 }
          ].map(p => `
            <g transform="rotate(${p.rot} ${p.cx} ${p.cy})">
              <path d="M ${p.cx - 15} ${p.cy} Q ${p.cx} ${p.cy + 19} ${p.cx + 15} ${p.cy} Q ${p.cx} ${p.cy - 13} ${p.cx - 15} ${p.cy}"
                    fill="url(#${uid}-banana-petal)" stroke="#1b4332" stroke-width="1.2"/>
              <path d="M ${p.cx - 8} ${p.cy + 1} Q ${p.cx} ${p.cy - 6} ${p.cx + 8} ${p.cy + 1}"
                    fill="none" stroke="#95d5b2" stroke-width="0.9" opacity="0.65"/>
            </g>
          `).join('')}
          <ellipse cx="100" cy="121" rx="72" ry="24" fill="url(#${uid}-banana-body)" stroke="#1b4332" stroke-width="1.5"/>
          <ellipse cx="100" cy="117" rx="60" ry="18" fill="#74c69d" stroke="#2d6a4f" stroke-width="0.8"/>
          <ellipse cx="100" cy="114" rx="48" ry="13" fill="#b7e4c7"/>
          <ellipse cx="100" cy="114" rx="36" ry="9" fill="#d8f3dc" opacity="0.65"/>
        </g>
      `
    },
    lotus: {
      name: 'กระทงกลีบบัว',
      desc: 'กระทงกลีบบัวสีชมพูซ้อนชั้น',
      render: (uid) => `
        <g id="lotus-base">
          <ellipse cx="100" cy="133" rx="84" ry="27" fill="#4a154b" opacity="0.45"/>
          ${[-45, -30, -15, 0, 15, 30, 45].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x = 100 + Math.sin(rad) * 65;
            const y = 122 + Math.cos(rad) * 12;
            return `
              <path d="M ${x - 14} ${y} Q ${x} ${y + 22} ${x + 14} ${y} Q ${x} ${y - 18} ${x - 14} ${y}"
                    fill="url(#${uid}-lotus-grad-outer)" stroke="#ff4d6d" stroke-width="1"
                    transform="rotate(${angle * 0.7} ${x} ${y})"/>
            `;
          }).join('')}
          ${[-35, -18, 0, 18, 35].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x = 100 + Math.sin(rad) * 48;
            const y = 118 + Math.cos(rad) * 9;
            return `
              <path d="M ${x - 12} ${y} Q ${x} ${y + 16} ${x + 12} ${y} Q ${x} ${y - 14} ${x - 12} ${y}"
                    fill="url(#${uid}-lotus-grad-inner)" stroke="#c9184a" stroke-width="1"
                    transform="rotate(${angle * 0.5} ${x} ${y})"/>
            `;
          }).join('')}
          <ellipse cx="100" cy="114" rx="38" ry="12" fill="#fff0f3" stroke="#ff758f" stroke-width="1"/>
          <ellipse cx="100" cy="113" rx="28" ry="8" fill="#ffe5ec" opacity="0.7"/>
        </g>
      `
    },
    coconut: {
      name: 'กระทงกะลามะพร้าว',
      desc: 'กระทงกะลามะพร้าวขัดเงา สไตล์กระทงสาย',
      render: (uid) => `
        <g id="coconut-base">
          <ellipse cx="100" cy="134" rx="76" ry="23" fill="#1a0f08" opacity="0.55"/>
          <path d="M 32 110 C 32 145 168 145 168 110 C 168 126 138 136 100 136 C 62 136 32 126 32 110 Z"
                fill="url(#${uid}-coconut-grad)" stroke="#2b1810" stroke-width="2"/>
          <path d="M 52 122 Q 74 132 106 131" fill="none" stroke="#a47148" stroke-width="1.8" stroke-linecap="round" opacity="0.45"/>
          <ellipse cx="100" cy="110" rx="68" ry="20" fill="#58311a" stroke="#2b1810" stroke-width="1.5"/>
          <ellipse cx="100" cy="110" rx="58" ry="15" fill="#f4ebd9" stroke="#bc8a5f" stroke-width="1.2"/>
          <ellipse cx="100" cy="110" rx="50" ry="12" fill="#3a1d0f"/>
        </g>
      `
    },
    bread: {
      name: 'กระทงขนมปัง',
      desc: 'กระทงขนมปังรูปเต่า ย่อยสลายเป็นอาหารปลาได้',
      render: (uid) => `
        <g id="bread-base">
          <ellipse cx="100" cy="134" rx="80" ry="25" fill="#451a03" opacity="0.35"/>
          <ellipse cx="52" cy="103" rx="12" ry="8" fill="#b45309" stroke="#92400e" stroke-width="1.1"/>
          <ellipse cx="148" cy="103" rx="12" ry="8" fill="#b45309" stroke="#92400e" stroke-width="1.1"/>
          <path d="M 94 96 L 100 88 L 106 96 Z" fill="#d97706" stroke="#92400e" stroke-width="1"/>
          <ellipse cx="42" cy="126" rx="14" ry="10" fill="#d97706" stroke="#92400e" stroke-width="1.2"/>
          <ellipse cx="158" cy="126" rx="14" ry="10" fill="#d97706" stroke="#92400e" stroke-width="1.2"/>
          <ellipse cx="100" cy="140" rx="18" ry="12" fill="#d97706" stroke="#92400e" stroke-width="1.2"/>
          <circle cx="94" cy="144" r="2.5" fill="#451a03"/>
          <circle cx="106" cy="144" r="2.5" fill="#451a03"/>
          <circle cx="93.3" cy="143.3" r="0.8" fill="#ffffff"/>
          <circle cx="105.3" cy="143.3" r="0.8" fill="#ffffff"/>
          <ellipse cx="100" cy="116" rx="66" ry="22" fill="url(#${uid}-bread-grad)" stroke="#92400e" stroke-width="2"/>
          <ellipse cx="100" cy="114" rx="52" ry="16" fill="#fde68a" stroke="#b45309" stroke-width="1" stroke-dasharray="4,3"/>
          <ellipse cx="100" cy="114" rx="36" ry="11" fill="#fef3c7"/>
        </g>
      `
    },
    ice: {
      name: 'กระทงน้ำแข็ง',
      desc: 'กระทงน้ำแข็ง ละลายลงน้ำได้หมด ไม่ทิ้งขยะ',
      render: (uid) => `
        <g id="ice-base">
          <ellipse cx="100" cy="133" rx="82" ry="25" fill="#0369a1" opacity="0.4"/>
          <path d="M 35 115 L 60 138 L 100 142 L 140 138 L 165 115 L 145 102 L 100 100 L 55 102 Z"
                fill="url(#${uid}-ice-grad)" stroke="#bae6fd" stroke-width="2" opacity="0.88"/>
          <path d="M 60 138 L 72 118 L 100 142 L 128 118 L 140 138" fill="none" stroke="#e0f2fe" stroke-width="0.9" opacity="0.55"/>
          <ellipse cx="100" cy="112" rx="55" ry="16" fill="#e0f2fe" opacity="0.88" stroke="#7dd3fc" stroke-width="1.5"/>
          <circle cx="65" cy="115" r="2.8" fill="#ffffff"/>
          <circle cx="135" cy="112" r="2.4" fill="#ffffff"/>
          <circle cx="100" cy="120" r="2" fill="#ffffff"/>
        </g>
      `
    },
    bamboo: {
      name: 'กระทงไม้ไผ่สาน',
      desc: 'กระทงไม้ไผ่จักสาน งานคราฟต์รักษ์โลก',
      render: (uid) => `
        <g id="bamboo-base">
          <ellipse cx="100" cy="134" rx="80" ry="24" fill="#422006" opacity="0.45"/>
          <!-- Woven bamboo bowl -->
          <path d="M 33 114 C 35 144 165 144 167 114 C 165 127 136 136 100 136 C 64 136 35 127 33 114 Z"
                fill="url(#${uid}-bamboo-grad)" stroke="#713f12" stroke-width="1.6"/>
          <!-- Woven cross-hatch texture lines -->
          ${[-48, -32, -16, 0, 16, 32, 48].map(dx => `
            <path d="M ${100 + dx} 123 Q ${100 + dx * 0.85} 133 ${100 + dx * 0.72} 136"
                  fill="none" stroke="#854d0e" stroke-width="1.1" opacity="0.6"/>
          `).join('')}
          <path d="M 42 124 Q 100 137 158 124" fill="none" stroke="#fef08a" stroke-width="1" opacity="0.55"/>
          <!-- Bamboo rim & inner leaf cushion -->
          <ellipse cx="100" cy="114" rx="68" ry="19" fill="#d97706" stroke="#713f12" stroke-width="1.5"/>
          <ellipse cx="100" cy="114" rx="62" ry="16" fill="#fde68a" stroke="#a16207" stroke-width="1"/>
          <ellipse cx="100" cy="114" rx="52" ry="13" fill="#bef264" stroke="#4d7c0f" stroke-width="0.9"/>
        </g>
      `
    },
    swan: {
      name: 'กระทงเรือหงส์ทอง',
      desc: 'กระทงเรือหงส์ทอง ทรงไทยสง่างาม',
      render: (uid) => `
        <g id="swan-base">
          <ellipse cx="100" cy="135" rx="84" ry="23" fill="#1e1b4b" opacity="0.45"/>
          <!-- Tail sweeping plumes (right) -->
          <path d="M 152 114 Q 176 98 181 74 Q 170 86 158 96 Q 172 95 178 88 Q 165 104 156 118 Z"
                fill="url(#${uid}-swan-gold)" stroke="#92400e" stroke-width="1.1"/>
          <!-- Swan boat hull -->
          <path d="M 28 112 Q 100 146 172 112 Q 156 128 100 131 Q 44 128 28 112 Z"
                fill="url(#${uid}-swan-gold)" stroke="#78350f" stroke-width="1.6"/>
          <path d="M 44 121 Q 100 134 156 121" fill="none" stroke="#fef08a" stroke-width="1.2" opacity="0.8"/>
          <!-- Swan curved neck & crowned head (left) -->
          <path d="M 38 116 Q 26 92 34 72 Q 39 61 48 64 Q 44 69 40 74 Q 35 89 47 113 Z"
                fill="url(#${uid}-swan-gold)" stroke="#78350f" stroke-width="1.2"/>
          <!-- Swan golden crest & beak -->
          <path d="M 37 64 L 33 55 L 41 61 Z" fill="#fef08a" stroke="#b45309" stroke-width="0.8"/>
          <path d="M 47 64 L 54 66 L 47 69 Z" fill="#f97316"/>
          <circle cx="42.5" cy="65.5" r="1.2" fill="#7f1d1d"/>
          <!-- Boat deck -->
          <ellipse cx="100" cy="113" rx="56" ry="15" fill="#15803d" stroke="#facc15" stroke-width="1.6"/>
          <ellipse cx="100" cy="113" rx="46" ry="11" fill="#4ade80" opacity="0.7"/>
        </g>
      `
    },
    corn_husk: {
      name: 'กระทงเปลือกข้าวโพด',
      desc: 'กระทงเปลือกข้าวโพด ย่อยสลายง่ายสีละมุน',
      render: (uid) => `
        <g id="corn-husk-base">
          <ellipse cx="100" cy="133" rx="85" ry="26" fill="#422006" opacity="0.38"/>
          ${[-48, -32, -16, 0, 16, 32, 48].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x = 100 + Math.sin(rad) * 66;
            const y = 122 + Math.cos(rad) * 12;
            return `
              <path d="M ${x - 13} ${y} Q ${x} ${y + 21} ${x + 13} ${y} Q ${x} ${y - 17} ${x - 13} ${y}"
                    fill="url(#${uid}-husk-outer)" stroke="#ca8a04" stroke-width="0.9"
                    transform="rotate(${angle * 0.65} ${x} ${y})"/>
            `;
          }).join('')}
          ${[-34, -17, 0, 17, 34].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x = 100 + Math.sin(rad) * 48;
            const y = 117 + Math.cos(rad) * 9;
            return `
              <path d="M ${x - 11} ${y} Q ${x} ${y + 15} ${x + 11} ${y} Q ${x} ${y - 13} ${x - 11} ${y}"
                    fill="url(#${uid}-husk-inner)" stroke="#eab308" stroke-width="0.8"
                    transform="rotate(${angle * 0.45} ${x} ${y})"/>
            `;
          }).join('')}
          <ellipse cx="100" cy="114" rx="40" ry="12" fill="#fef9c3" stroke="#eab308" stroke-width="1"/>
        </g>
      `
    }
  };

  const FLOWERS = {
    marigold: {
      name: 'ดอกดาวเรือง',
      desc: 'ดอกดาวเรืองสีเหลืองสดใส',
      render: () => `
        <g id="marigold-flowers">
          ${[
            { x: 74, y: 112, r: 13 },
            { x: 126, y: 112, r: 13 },
            { x: 100, y: 118, r: 15 },
            { x: 58, y: 115, r: 10 },
            { x: 142, y: 115, r: 10 }
          ].map(f => `
            <g transform="translate(${f.x}, ${f.y})">
              <ellipse cx="0" cy="3" rx="${f.r}" ry="${f.r * 0.72}" fill="#78350f" opacity="0.28"/>
              <circle cx="0" cy="0" r="${f.r}" fill="#f59e0b" stroke="#d97706" stroke-width="0.8"/>
              <circle cx="0" cy="-0.6" r="${f.r * 0.75}" fill="#fbbf24"/>
              <circle cx="0" cy="-1" r="${f.r * 0.5}" fill="#fde047"/>
              <circle cx="0" cy="-1.2" r="${f.r * 0.25}" fill="#eab308"/>
            </g>
          `).join('')}
        </g>
      `
    },
    orchid: {
      name: 'ดอกกล้วยไม้',
      desc: 'ดอกกล้วยไม้สีม่วงอ่อนสลับขาว',
      render: () => `
        <g id="orchid-flowers">
          ${[
            { x: 70, y: 112, sc: 0.9 },
            { x: 130, y: 112, sc: 0.9 },
            { x: 100, y: 118, sc: 1.1 }
          ].map(o => `
            <g transform="translate(${o.x}, ${o.y}) scale(${o.sc})">
              <ellipse cx="0" cy="4" rx="12" ry="7" fill="#3b0764" opacity="0.25"/>
              <path d="M 0 0 C -12 -12 -14 6 0 8 C 14 6 12 -12 0 0 Z" fill="#c084fc"/>
              <path d="M 0 0 C -18 -4 -12 14 0 10 C 12 14 18 -4 0 0 Z" fill="#e879f9"/>
              <circle cx="0" cy="4" r="3.5" fill="#facc15"/>
              <circle cx="0" cy="4" r="1.5" fill="#9333ea"/>
            </g>
          `).join('')}
        </g>
      `
    },
    rose: {
      name: 'ดอกกุหลาบ',
      desc: 'ดอกกุหลาบสีชมพูแดง',
      render: () => `
        <g id="rose-flowers">
          ${[
            { x: 72, y: 113, r: 12 },
            { x: 128, y: 113, r: 12 },
            { x: 100, y: 118, r: 14 }
          ].map(r => `
            <g transform="translate(${r.x}, ${r.y})">
              <ellipse cx="0" cy="3" rx="${r.r}" ry="${r.r * 0.72}" fill="#4c0519" opacity="0.25"/>
              <circle cx="0" cy="0" r="${r.r}" fill="#e11d48"/>
              <circle cx="0" cy="-0.5" r="${r.r * 0.78}" fill="#f43f5e"/>
              <path d="M -8 -3 Q 0 -10 8 -3 Q 0 8 -8 -3 Z" fill="#fb7185"/>
              <path d="M -4 -1 Q 0 -6 4 -1 Q 0 4 -4 -1 Z" fill="#ffe4e6"/>
            </g>
          `).join('')}
        </g>
      `
    },
    lotus_bloom: {
      name: 'ดอกบัวหลวง',
      desc: 'ดอกบัวหลวงสีขาวอมชมพู',
      render: () => `
        <g id="lotus-bloom-flowers">
          <g transform="translate(100, 115)">
            <ellipse cx="0" cy="3" rx="16" ry="7" fill="#831843" opacity="0.22"/>
            ${[-40, -20, 0, 20, 40].map(a => `
              <path d="M 0 0 C -8 -16 8 -16 0 0 Z" fill="#f8fafc" stroke="#f472b6" stroke-width="0.8"
                    transform="rotate(${a})"/>
            `).join('')}
            <circle cx="0" cy="-2" r="5" fill="#facc15"/>
          </g>
        </g>
      `
    },
    jasmine: {
      name: 'ดอกมะลิ',
      desc: 'ดอกมะลิสีขาวสะอาดตา',
      render: () => `
        <g id="jasmine-flowers">
          ${[55, 75, 95, 115, 135, 145].map((x, i) => `
            <circle cx="${x}" cy="${117 + (i % 2) * 4}" r="5.5" fill="#0f172a" opacity="0.18"/>
            <circle cx="${x}" cy="${115 + (i % 2) * 4}" r="5.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>
            <circle cx="${x}" cy="${115 + (i % 2) * 4}" r="2" fill="#fef08a"/>
          `).join('')}
        </g>
      `
    },
    globe_amaranth: {
      name: 'ดอกบานไม่รู้โรย',
      desc: 'ดอกบานไม่รู้โรยสีบานเย็น สื่อถึงรักมั่นคง',
      render: () => `
        <g id="amaranth-flowers">
          ${[
            { x: 64, y: 114, r: 9.5 },
            { x: 82, y: 117, r: 10.5 },
            { x: 100, y: 118, r: 11.5 },
            { x: 118, y: 117, r: 10.5 },
            { x: 136, y: 114, r: 9.5 }
          ].map(g => `
            <g transform="translate(${g.x}, ${g.y})">
              <ellipse cx="0" cy="3" rx="${g.r}" ry="${g.r * 0.7}" fill="#500724" opacity="0.28"/>
              <circle cx="0" cy="0" r="${g.r}" fill="#be185d" stroke="#831843" stroke-width="0.8"/>
              <circle cx="-2" cy="-2" r="${g.r * 0.55}" fill="#ec4899"/>
              <circle cx="2" cy="-1.5" r="${g.r * 0.3}" fill="#f9a8d4"/>
              <circle cx="-1" cy="2" r="1.3" fill="#fbcfe8"/>
            </g>
          `).join('')}
        </g>
      `
    },
    sunflower: {
      name: 'ดอกทานตะวัน',
      desc: 'ดอกทานตะวันสีเหลืองสดใสอบอุ่น',
      render: () => `
        <g id="sunflower-flowers">
          ${[
            { x: 70, y: 113, sc: 0.85 },
            { x: 130, y: 113, sc: 0.85 },
            { x: 100, y: 118, sc: 1.05 }
          ].map(s => `
            <g transform="translate(${s.x}, ${s.y}) scale(${s.sc})">
              <ellipse cx="0" cy="3" rx="14" ry="8" fill="#451a03" opacity="0.28"/>
              ${[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(deg => `
                <ellipse cx="0" cy="-9" rx="3.4" ry="6.2" fill="#facc15" stroke="#eab308" stroke-width="0.6" transform="rotate(${deg})"/>
              `).join('')}
              <circle cx="0" cy="0" r="6" fill="#78350f" stroke="#451a03" stroke-width="0.8"/>
              <circle cx="-1.5" cy="-1.5" r="2" fill="#92400e"/>
            </g>
          `).join('')}
        </g>
      `
    },
    cherry_blossom: {
      name: 'ดอกซากุระ',
      desc: 'ดอกซากุระสีชมพูอ่อนแสนละมุน',
      render: () => `
        <g id="sakura-flowers">
          ${[
            { x: 60, y: 114, sc: 0.85 },
            { x: 82, y: 117, sc: 0.95 },
            { x: 100, y: 119, sc: 1.05 },
            { x: 119, y: 117, sc: 0.95 },
            { x: 140, y: 114, sc: 0.85 }
          ].map(f => `
            <g transform="translate(${f.x}, ${f.y}) scale(${f.sc})">
              <ellipse cx="0" cy="2.5" rx="9" ry="5" fill="#831843" opacity="0.18"/>
              ${[0, 72, 144, 216, 288].map(deg => `
                <path d="M 0 0 C -3.5 -6 -3 -10 0 -9 C 3 -10 3.5 -6 0 0 Z" fill="#fbcfe8" stroke="#f472b6" stroke-width="0.6" transform="rotate(${deg})"/>
              `).join('')}
              <circle cx="0" cy="0" r="2.2" fill="#be185d"/>
              <circle cx="0" cy="0" r="1" fill="#fef08a"/>
            </g>
          `).join('')}
        </g>
      `
    }
  };

  const CANDLES = {
    gold: {
      name: 'เทียนสีทอง',
      color: '#facc15',
      flame: '#fb923c',
      glow: 'rgba(250, 204, 21, 0.45)',
      render: (uid) => `
        <g id="candle-gold">
          <ellipse cx="100" cy="108" rx="34" ry="12" fill="url(#${uid}-candle-glow-gold)" opacity="0.45"/>
          <rect x="97" y="65" width="6" height="40" rx="3" fill="url(#${uid}-candle-stick-gold)" stroke="#ca8a04" stroke-width="0.8"/>
          <line x1="100" y1="65" x2="100" y2="57" stroke="#292524" stroke-width="1.4"/>
          <circle cx="100" cy="51" r="16" fill="url(#${uid}-candle-glow-gold)" opacity="0.72"/>
          <path d="M 100 41 C 93.5 49.5 95.5 58 100 58 C 104.5 58 106.5 49.5 100 41 Z" fill="#f97316"/>
          <path d="M 100 44.5 C 96 51.5 97 57 100 57 C 103 57 104 51.5 100 44.5 Z" fill="#fef08a"/>
          <ellipse cx="100" cy="53" rx="1.6" ry="3" fill="#ffffff" opacity="0.9"/>
        </g>
      `
    },
    ruby: {
      name: 'เทียนสีแดง',
      color: '#ef4444',
      flame: '#f87171',
      glow: 'rgba(239, 68, 68, 0.45)',
      render: (uid) => `
        <g id="candle-ruby">
          <ellipse cx="100" cy="108" rx="34" ry="12" fill="url(#${uid}-candle-glow-ruby)" opacity="0.45"/>
          <rect x="97" y="65" width="6" height="40" rx="3" fill="url(#${uid}-candle-stick-ruby)" stroke="#991b1b" stroke-width="0.8"/>
          <line x1="100" y1="65" x2="100" y2="57" stroke="#292524" stroke-width="1.4"/>
          <circle cx="100" cy="51" r="16" fill="url(#${uid}-candle-glow-ruby)" opacity="0.72"/>
          <path d="M 100 41 C 93.5 49.5 95.5 58 100 58 C 104.5 58 106.5 49.5 100 41 Z" fill="#ff4d6d"/>
          <path d="M 100 44.5 C 96 51.5 97 57 100 57 C 103 57 104 51.5 100 44.5 Z" fill="#fff0f3"/>
          <ellipse cx="100" cy="53" rx="1.6" ry="3" fill="#ffffff" opacity="0.9"/>
        </g>
      `
    },
    crystal: {
      name: 'เทียนสีฟ้า',
      color: '#38bdf8',
      flame: '#0284c7',
      glow: 'rgba(56, 189, 248, 0.45)',
      render: (uid) => `
        <g id="candle-crystal">
          <ellipse cx="100" cy="108" rx="34" ry="12" fill="url(#${uid}-candle-glow-crystal)" opacity="0.45"/>
          <rect x="97" y="65" width="6" height="40" rx="3" fill="url(#${uid}-candle-stick-crystal)" stroke="#0369a1" stroke-width="0.8"/>
          <line x1="100" y1="65" x2="100" y2="57" stroke="#292524" stroke-width="1.4"/>
          <circle cx="100" cy="51" r="16" fill="url(#${uid}-candle-glow-crystal)" opacity="0.72"/>
          <path d="M 100 41 C 93.5 49.5 95.5 58 100 58 C 104.5 58 106.5 49.5 100 41 Z" fill="#38bdf8"/>
          <path d="M 100 44.5 C 96 51.5 97 57 100 57 C 103 57 104 51.5 100 44.5 Z" fill="#f0f9ff"/>
          <ellipse cx="100" cy="53" rx="1.6" ry="3" fill="#ffffff" opacity="0.9"/>
        </g>
      `
    },
    emerald: {
      name: 'เทียนสีเขียว',
      color: '#34d399',
      flame: '#10b981',
      glow: 'rgba(52, 211, 153, 0.45)',
      render: (uid) => `
        <g id="candle-emerald">
          <ellipse cx="100" cy="108" rx="34" ry="12" fill="url(#${uid}-candle-glow-emerald)" opacity="0.45"/>
          <rect x="97" y="65" width="6" height="40" rx="3" fill="url(#${uid}-candle-stick-emerald)" stroke="#047857" stroke-width="0.8"/>
          <line x1="100" y1="65" x2="100" y2="57" stroke="#292524" stroke-width="1.4"/>
          <circle cx="100" cy="51" r="16" fill="url(#${uid}-candle-glow-emerald)" opacity="0.72"/>
          <path d="M 100 41 C 93.5 49.5 95.5 58 100 58 C 104.5 58 106.5 49.5 100 41 Z" fill="#10b981"/>
          <path d="M 100 44.5 C 96 51.5 97 57 100 57 C 103 57 104 51.5 100 44.5 Z" fill="#d1fae5"/>
          <ellipse cx="100" cy="53" rx="1.6" ry="3" fill="#ffffff" opacity="0.9"/>
        </g>
      `
    },
    amethyst: {
      name: 'เทียนสีม่วง',
      color: '#c084fc',
      flame: '#a855f7',
      glow: 'rgba(192, 132, 252, 0.45)',
      render: (uid) => `
        <g id="candle-amethyst">
          <ellipse cx="100" cy="108" rx="34" ry="12" fill="url(#${uid}-candle-glow-amethyst)" opacity="0.45"/>
          <rect x="97" y="65" width="6" height="40" rx="3" fill="url(#${uid}-candle-stick-amethyst)" stroke="#6b21a8" stroke-width="0.8"/>
          <line x1="100" y1="65" x2="100" y2="57" stroke="#292524" stroke-width="1.4"/>
          <circle cx="100" cy="51" r="16" fill="url(#${uid}-candle-glow-amethyst)" opacity="0.72"/>
          <path d="M 100 41 C 93.5 49.5 95.5 58 100 58 C 104.5 58 106.5 49.5 100 41 Z" fill="#a855f7"/>
          <path d="M 100 44.5 C 96 51.5 97 57 100 57 C 103 57 104 51.5 100 44.5 Z" fill="#f3e8ff"/>
          <ellipse cx="100" cy="53" rx="1.6" ry="3" fill="#ffffff" opacity="0.9"/>
        </g>
      `
    }
  };

  const INCENSE = {
    render: () => `
      <g id="incense-sticks">
        <line x1="88" y1="105" x2="84" y2="52" stroke="#78350f" stroke-width="1.4"/>
        <line x1="92" y1="105" x2="90" y2="48" stroke="#78350f" stroke-width="1.4"/>
        <line x1="95" y1="105" x2="95" y2="50" stroke="#78350f" stroke-width="1.4"/>
        <circle cx="84" cy="52" r="2.2" fill="#f97316" opacity="0.45"/>
        <circle cx="84" cy="52" r="1.4" fill="#fb923c"/>
        <circle cx="90" cy="48" r="2.2" fill="#f97316" opacity="0.45"/>
        <circle cx="90" cy="48" r="1.4" fill="#fb923c"/>
        <circle cx="95" cy="50" r="2.2" fill="#f97316" opacity="0.45"/>
        <circle cx="95" cy="50" r="1.4" fill="#fb923c"/>
        <path d="M 84 52 Q 80 40 88 30 Q 95 20 86 10" fill="none" stroke="#e2e8f0" stroke-width="0.8" opacity="0.35"/>
        <path d="M 90 48 Q 94 36 88 26 Q 84 16 90 8" fill="none" stroke="#e2e8f0" stroke-width="0.8" opacity="0.35"/>
        <path d="M 95 50 Q 98 39 93 29 Q 89 19 95 11" fill="none" stroke="#cbd5e1" stroke-width="0.7" opacity="0.25"/>
      </g>
    `
  };

  const COINS = {
    gold: {
      name: 'เหรียญทอง',
      render: () => `
        <g id="coin-gold">
          <ellipse cx="85" cy="122" rx="7" ry="4" fill="#fbbf24" stroke="#b45309" stroke-width="0.8"/>
          <ellipse cx="115" cy="122" rx="7" ry="4" fill="#fbbf24" stroke="#b45309" stroke-width="0.8"/>
          <ellipse cx="100" cy="124" rx="7.5" ry="4.5" fill="#f59e0b" stroke="#78350f" stroke-width="0.8"/>
          <rect x="98" y="122.5" width="4" height="2.5" fill="#d97706"/>
        </g>
      `
    },
    silver: {
      name: 'เหรียญเงิน',
      render: () => `
        <g id="coin-silver">
          <ellipse cx="85" cy="122" rx="7" ry="4" fill="#e2e8f0" stroke="#64748b" stroke-width="0.8"/>
          <ellipse cx="115" cy="122" rx="7" ry="4" fill="#e2e8f0" stroke="#64748b" stroke-width="0.8"/>
          <ellipse cx="100" cy="124" rx="7.5" ry="4.5" fill="#cbd5e1" stroke="#475569" stroke-width="0.8"/>
          <rect x="98" y="122.5" width="4" height="2.5" fill="#94a3b8"/>
        </g>
      `
    },
    lucky_gem: {
      name: 'พลอยมงคล',
      render: () => `
        <g id="coin-gems">
          <!-- Left Ruby Gem -->
          <polygon points="85,118 90,122 85,126 80,122" fill="#f43f5e" stroke="#9f1239" stroke-width="0.8"/>
          <polygon points="85,119.5 87.5,122 85,124 82.5,122" fill="#fda4af"/>
          <!-- Right Emerald Gem -->
          <polygon points="115,118 120,122 115,126 110,122" fill="#10b981" stroke="#065f46" stroke-width="0.8"/>
          <polygon points="115,119.5 117.5,122 115,124 112.5,122" fill="#6ee7b7"/>
          <!-- Center Sapphire / Diamond Gem -->
          <polygon points="100,119 106,124 100,129 94,124" fill="#38bdf8" stroke="#0369a1" stroke-width="0.9"/>
          <polygon points="100,121 103.5,124 100,126.5 96.5,124" fill="#e0f2fe"/>
        </g>
      `
    },
    none: {
      name: 'ไม่ใส่เหรียญ',
      render: () => ''
    }
  };

  const DECORATIONS = {
    none: {
      name: 'แบบเรียบง่าย',
      render: () => ''
    },
    garland: {
      name: 'พวงมาลัยดอกรัก',
      render: () => `
        <g id="decor-garland">
          <path d="M 58 123 Q 100 139 142 123" fill="none" stroke="#f8fafc" stroke-width="4.2" stroke-linecap="round"/>
          <path d="M 58 123 Q 100 139 142 123" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="3,3" stroke-linecap="round"/>
          <!-- Rose knots at garland ends & center -->
          <circle cx="58" cy="123" r="3.5" fill="#fb7185" stroke="#be123c" stroke-width="0.7"/>
          <circle cx="142" cy="123" r="3.5" fill="#fb7185" stroke="#be123c" stroke-width="0.7"/>
          <path d="M 96 131 L 104 131 L 102 140 L 98 140 Z" fill="#f43f5e" stroke="#9f1239" stroke-width="0.7"/>
          <circle cx="100" cy="130" r="3.8" fill="#fb7185" stroke="#be123c" stroke-width="0.7"/>
        </g>
      `
    },
    umbrella: {
      name: 'ร่มกระดาษล้านนา',
      render: () => `
        <g id="decor-umbrella" transform="translate(130, 82) rotate(14)">
          <!-- Bamboo handle -->
          <line x1="0" y1="0" x2="0" y2="31" stroke="#92400e" stroke-width="2"/>
          <!-- Lanna umbrella canopy -->
          <path d="M -20 4 Q 0 -14 20 4 Q 10 1 0 3 Q -10 1 -20 4 Z" fill="#e11d48" stroke="#fde047" stroke-width="1"/>
          <path d="M -11 2.5 Q 0 -10 11 2.5" fill="none" stroke="#fef08a" stroke-width="0.8" opacity="0.85"/>
          <line x1="0" y1="-8" x2="0" y2="2" stroke="#fde047" stroke-width="0.9"/>
          <!-- Top finial -->
          <circle cx="0" cy="-7.5" r="1.8" fill="#fde047"/>
        </g>
      `
    },
    flag: {
      name: 'ธงฉัตรทองคู่',
      render: () => `
        <g id="decor-flag">
          <!-- Left golden pennant -->
          <line x1="66" y1="108" x2="64" y2="62" stroke="#b45309" stroke-width="1.3"/>
          <polygon points="64,63 50,69 64,75" fill="#facc15" stroke="#ca8a04" stroke-width="0.8"/>
          <circle cx="64" cy="61.5" r="1.8" fill="#fef08a"/>
          <!-- Right golden pennant -->
          <line x1="134" y1="108" x2="136" y2="62" stroke="#b45309" stroke-width="1.3"/>
          <polygon points="136,63 150,69 136,75" fill="#facc15" stroke="#ca8a04" stroke-width="0.8"/>
          <circle cx="136" cy="61.5" r="1.8" fill="#fef08a"/>
        </g>
      `
    }
  };

  // Generate full SVG markup
  function generateSVG(config = {}) {
    const uid = `k${++svgCounter}`;
    const baseKey = config.base in BASES ? config.base : 'banana_leaf';
    const flowerKey = config.flower in FLOWERS ? config.flower : 'marigold';
    const candleKey = config.candle in CANDLES ? config.candle : 'gold';
    const coinKey = config.coin in COINS ? config.coin : 'gold';
    const decorKey = config.decor in DECORATIONS ? config.decor : 'none';
    const hasIncense = config.incense !== false;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170" width="100%" height="100%" class="krathong-svg">
        <defs>
          <!-- Base Gradients -->
          <linearGradient id="${uid}-banana-petal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#52b788"/>
            <stop offset="100%" stop-color="#2d6a4f"/>
          </linearGradient>
          <linearGradient id="${uid}-banana-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#74c69d"/>
            <stop offset="100%" stop-color="#2d6a4f"/>
          </linearGradient>
          <linearGradient id="${uid}-lotus-grad-outer" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#ff758f"/>
            <stop offset="100%" stop-color="#fff0f3"/>
          </linearGradient>
          <linearGradient id="${uid}-lotus-grad-inner" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#ff4d6d"/>
            <stop offset="100%" stop-color="#ffe5ec"/>
          </linearGradient>
          <linearGradient id="${uid}-coconut-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#5c3419"/>
            <stop offset="55%" stop-color="#3a1e0d"/>
            <stop offset="100%" stop-color="#1d0d05"/>
          </linearGradient>
          <linearGradient id="${uid}-bread-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
          <linearGradient id="${uid}-ice-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#e0f2fe"/>
            <stop offset="50%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
          <linearGradient id="${uid}-bamboo-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f59e0b"/>
            <stop offset="60%" stop-color="#b45309"/>
            <stop offset="100%" stop-color="#78350f"/>
          </linearGradient>
          <linearGradient id="${uid}-swan-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="45%" stop-color="#facc15"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
          <linearGradient id="${uid}-husk-outer" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="100%" stop-color="#fefce8"/>
          </linearGradient>
          <linearGradient id="${uid}-husk-inner" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#facc15"/>
            <stop offset="100%" stop-color="#fef9c3"/>
          </linearGradient>

          <!-- Candle Stick Gradients -->
          <linearGradient id="${uid}-candle-stick-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="45%" stop-color="#fef9c3"/>
            <stop offset="100%" stop-color="#ca8a04"/>
          </linearGradient>
          <linearGradient id="${uid}-candle-stick-ruby" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#f87171"/>
            <stop offset="45%" stop-color="#fecdd3"/>
            <stop offset="100%" stop-color="#b91c1c"/>
          </linearGradient>
          <linearGradient id="${uid}-candle-stick-crystal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#7dd3fc"/>
            <stop offset="45%" stop-color="#e0f2fe"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
          <linearGradient id="${uid}-candle-stick-emerald" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#6ee7b7"/>
            <stop offset="45%" stop-color="#d1fae5"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
          <linearGradient id="${uid}-candle-stick-amethyst" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#d8b4fe"/>
            <stop offset="45%" stop-color="#f3e8ff"/>
            <stop offset="100%" stop-color="#7e22ce"/>
          </linearGradient>

          <!-- Glow radial gradients -->
          <radialGradient id="${uid}-candle-glow-gold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.85"/>
            <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="${uid}-candle-glow-ruby" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffe4e6" stop-opacity="0.85"/>
            <stop offset="50%" stop-color="#f43f5e" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#f43f5e" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="${uid}-candle-glow-crystal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#f0f9ff" stop-opacity="0.85"/>
            <stop offset="50%" stop-color="#0ea5e9" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="${uid}-candle-glow-emerald" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#d1fae5" stop-opacity="0.85"/>
            <stop offset="50%" stop-color="#10b981" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="${uid}-candle-glow-amethyst" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#f3e8ff" stop-opacity="0.85"/>
            <stop offset="50%" stop-color="#a855f7" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- Base Layer -->
        ${BASES[baseKey].render(uid)}

        <!-- Flowers Layer -->
        ${FLOWERS[flowerKey].render(uid)}

        <!-- Coins / Gems Layer -->
        ${COINS[coinKey].render(uid)}

        <!-- Extra Decorations Layer -->
        ${DECORATIONS[decorKey].render(uid)}

        <!-- Incense Layer -->
        ${hasIncense ? INCENSE.render(uid) : ''}

        <!-- Candle Layer -->
        ${CANDLES[candleKey].render(uid)}
      </svg>
    `;
  }

  return {
    BASES,
    FLOWERS,
    CANDLES,
    COINS,
    DECORATIONS,
    generateSVG
  };
})();
