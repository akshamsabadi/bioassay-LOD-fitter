const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Replace the xTicks and domain logic
const xTicksRegex = /const \{ xTicks, xDomain \} = useMemo.*?return \{ xTicks: ticks, xDomain: \[zeroX, maxAxisValue\] \};\n  \}, \[results\]\);/s;

const newXTicks = `const { xTicks, leftDomain, rightDomain, zeroX, minX } = useMemo(() => {
    if (!results) return { xTicks: [], leftDomain: ['auto', 'auto'], rightDomain: ['auto', 'auto'], zeroX: 0, minX: 0 };
    const minX = Math.min(...results.fit.actualX.filter(x => x > 0));
    const maxX = Math.max(...results.fit.actualX);
    const zeroX = minX / 10;
    const maxAxisValue = maxX * 1.5;
    
    const logMin = Math.floor(Math.log10(zeroX));
    const logMax = Math.ceil(Math.log10(maxAxisValue));
    const ticks = [];
    for (let i = logMin; i <= logMax; i++) {
      const majorVal = Math.pow(10, i);
      if (majorVal <= maxAxisValue && majorVal >= minX / 1.5) ticks.push(majorVal);
      if (i < logMax) {
        for (let j = 2; j <= 9; j++) {
          const minorVal = j * Math.pow(10, i);
          if (minorVal <= maxAxisValue && minorVal >= minX / 1.5) ticks.push(minorVal);
        }
      }
    }
    return { xTicks: ticks, leftDomain: [zeroX / 2, zeroX * 2], rightDomain: [minX / 1.5, maxAxisValue], zeroX, minX };
  }, [results]);`;

code = code.replace(xTicksRegex, newXTicks);

// 2. Add split data properties after scatterData
const splitDataInsert = `
  const leftChartData = useMemo(() => chartData.filter(d => d.x <= zeroX * 2), [chartData, zeroX]);
  const rightChartData = useMemo(() => chartData.filter(d => d.x >= minX / 1.5), [chartData, minX]);
  const leftScatterData = useMemo(() => scatterData.filter(d => d.x <= zeroX * 2), [scatterData, zeroX]);
  const rightScatterData = useMemo(() => scatterData.filter(d => d.x >= minX / 1.5), [scatterData, minX]);
`;
code = code.replace('  const updateRow', splitDataInsert + '  const updateRow');

// 3. Update Chart JSX
const chartFrameRegex = /<div className="chart-frame".*?<\/div>/s;

const newChartFrame = `<div className="chart-frame" ref={chartRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, display: 'flex', position: 'relative', paddingBottom: '20px' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'var(--overlay2)' }}>{xAxisLabel}</div>
                    
                    <div style={{ width: '15%', height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={leftChartData} margin={{ top: 25, right: 0, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface0)" vertical={false} horizontalValues={yMajorTicks} />
                          <XAxis dataKey="x" type="number" scale="log" domain={leftDomain as any} allowDataOverflow={true} stroke="var(--text)" ticks={[zeroX]} interval={0} tickMargin={0} tickLine={false} tick={<CustomXAxisTick zeroX={zeroX} />} />
                          <YAxis stroke="var(--text)" domain={yDomain as any} ticks={yMajorTicks} interval={0} tickMargin={0} allowDataOverflow={true} tickLine={false} tick={<CustomYAxisTick />} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'var(--overlay2)', fontSize: 11, offset: -5 }} />
                          {yTicks && yTicks.filter(t => !yMajorTicks.includes(t)).map(tick => <ReferenceLine key={\`minor-y-\${tick}\`} y={tick} stroke="none" label={<CustomMinorYAxisTickLabel />} />)}
                          
                          <Area dataKey="ciRange" stroke="none" fill="var(--blue)" fillOpacity={0.15} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
                          <Line dataKey="trend" stroke="var(--blue)" strokeWidth={3} dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
                          <Scatter data={leftScatterData} dataKey="y" isAnimationActive={false} legendType="none" shape={renderScatterDot} />
                          
                          <ReferenceLine y={results.lc} stroke="#fab387" strokeDasharray="4 4" style={{ pointerEvents: 'none' }} />
                          <ReferenceLine y={results.ld} stroke="#a6e3a1" strokeDasharray="4 4" style={{ pointerEvents: 'none' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ width: '20px', height: '100%', position: 'relative' }}>
                      <div style={{ position: 'absolute', bottom: '10px', left: 0, width: '20px', height: '20px' }}>
                        <svg width="20" height="20" style={{ overflow: 'visible' }}>
                          <path d="M 4 14 L 8 6 M 12 14 L 16 6" stroke="var(--text)" strokeWidth={1} strokeLinecap="round" fill="none" />
                        </svg>
                      </div>
                    </div>

                    <div style={{ flex: 1, height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={rightChartData} margin={{ top: 25, right: 30, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface0)" vertical={false} horizontalValues={yMajorTicks} />
                          <XAxis dataKey="x" type="number" scale="log" domain={rightDomain as any} allowDataOverflow={true} stroke="var(--text)" ticks={xTicks} interval={0} tickMargin={0} tickLine={false} tick={<CustomXAxisTick zeroX={zeroX} />} />
                          <YAxis domain={yDomain as any} hide={true} />
                          
                          <Area dataKey="ciRange" stroke="none" fill="var(--blue)" fillOpacity={0.15} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
                          <ReferenceArea x1={results.lodCI.low} x2={results.lodCI.high} fill="var(--yellow)" fillOpacity={0.15} strokeOpacity={0} ifOverflow="hidden" style={{ pointerEvents: 'none' }} />
                          <Line dataKey="trend" stroke="var(--blue)" strokeWidth={3} dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
                          <Scatter data={rightScatterData} dataKey="y" isAnimationActive={false} legendType="none" shape={renderScatterDot} />
                          
                          <ReferenceLine y={results.lc} stroke="#fab387" strokeDasharray="4 4" label={<CustomLcLabel />} style={{ pointerEvents: 'none' }} />
                          <ReferenceLine y={results.ld} stroke="#a6e3a1" strokeDasharray="4 4" label={<CustomLdLabel />} style={{ pointerEvents: 'none' }} />
                          <ReferenceLine x={results.lodConc} stroke="var(--yellow)" strokeWidth={2} label={{ position: 'top', value: 'LOD', fill: 'var(--yellow)', fontSize: 10 }} style={{ pointerEvents: 'none' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <CustomLegend />
                  {hoveredPoint && hoveredPoint.cx && hoveredPoint.cy && (
                    <div style={{ position: 'absolute', left: hoveredPoint.cx + 15, top: hoveredPoint.cy - 15, backgroundColor: 'var(--mantle)', border: '1px solid var(--pink)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text)', pointerEvents: 'none', zIndex: 100, boxShadow: '0 8px 16px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: 'var(--subtext0)' }}>Concentration</span><span style={{ fontWeight: 'bold', color: 'var(--text)', fontFamily: '"Google Sans Mono", monospace' }}>{hoveredPoint.conc}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: 'var(--subtext0)' }}>Signal</span><span style={{ fontWeight: 'bold', color: 'var(--pink)', fontFamily: '"Google Sans Mono", monospace' }}>{hoveredPoint.y.toFixed(4)}</span></div>
                    </div>
                  )}
                </div>`;

code = code.replace(chartFrameRegex, newChartFrame);

// 4. Update the version inside App.tsx
code = code.replace(/v0\.3\.16/g, 'v0.4.9');

fs.writeFileSync('src/App.tsx', code);
console.log("App.tsx natively split!");
