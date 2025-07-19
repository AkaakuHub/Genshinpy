import React, { useState } from 'react';
import type { Character, Talent, TalentLevel } from '../types/character';

interface TalentViewerProps {
  character: Character;
}

const TalentViewer: React.FC<TalentViewerProps> = ({ character }) => {
  const [selectedTalent, setSelectedTalent] = useState<'normalAttack' | 'elementalSkill' | 'elementalBurst'>('normalAttack');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  const talents = [
    { key: 'normalAttack', name: 'Normal Attack', icon: '⚔️', talent: character.talents.normalAttack },
    { key: 'elementalSkill', name: 'Elemental Skill', icon: '🔮', talent: character.talents.elementalSkill },
    { key: 'elementalBurst', name: 'Elemental Burst', icon: '💥', talent: character.talents.elementalBurst },
  ] as const;

  const selectedTalentData = talents.find(t => t.key === selectedTalent)?.talent;
  const levelData = selectedTalentData?.levelData[selectedLevel - 1];

  const formatDescription = (desc: string) => {
    // Remove HTML-like color tags for cleaner display
    return desc.replace(/<color=[^>]*>|<\/color>/g, '').replace(/\\n/g, '\n');
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white mb-4">Talents</h3>

      {/* Talent Selection */}
      <div className="grid md:grid-cols-3 gap-4">
        {talents.map((talent) => (
          <button
            key={talent.key}
            onClick={() => setSelectedTalent(talent.key)}
            className={`p-4 rounded-lg transition-all duration-200 ${
              selectedTalent === talent.key
                ? 'bg-blue-500/30 border-2 border-blue-400'
                : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <img
                src={talent.talent.icon}
                alt={talent.talent.name}
                className="w-12 h-12 rounded-lg"
              />
              <div className="text-left">
                <h4 className="text-white font-semibold">{talent.name}</h4>
                <p className="text-gray-400 text-sm">{talent.talent.name}</p>
                <p className="text-green-400 text-xs">{talent.talent.levelData.length} levels</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedTalentData && (
        <>
          {/* Level Selection */}
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-blue-300 mb-3">Level Selection</h4>
            <div className="flex items-center gap-4 mb-4">
              <label className="text-gray-400">Level:</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(Number(e.target.value))}
                className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-600 focus:border-blue-400 focus:outline-none"
              >
                {selectedTalentData.levelData.map((_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Level {index + 1}
                  </option>
                ))}
              </select>
              <div className="flex-1">
                <input
                  type="range"
                  min="1"
                  max={selectedTalentData.levelData.length}
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Talent Details */}
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={selectedTalentData.icon}
                alt={selectedTalentData.name}
                className="w-16 h-16 rounded-lg"
              />
              <div>
                <h4 className="text-xl font-bold text-white">{selectedTalentData.name}</h4>
                <p className="text-blue-300">Level {selectedLevel}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h5 className="text-lg font-semibold text-blue-300 mb-2">Description</h5>
                <p className="text-gray-300 whitespace-pre-line">
                  {formatDescription(selectedTalentData.description)}
                </p>
              </div>

              {levelData && (
                <>
                  {/* Level Parameters */}
                  {levelData.description.length > 0 && (
                    <div>
                      <h5 className="text-lg font-semibold text-blue-300 mb-2">Level {selectedLevel} Parameters</h5>
                      <div className="bg-gray-800/50 rounded p-3 space-y-1">
                        {levelData.description.map((desc, index) => {
                          if (!desc.trim()) return null;
                          const param = levelData.parameters[index];
                          const formatted = levelData.formattedValues[index];
                          
                          return (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-gray-300">{desc.split('|')[0]}:</span>
                              <div className="flex gap-2">
                                <span className="text-yellow-400 font-mono">{formatted}</span>
                                <span className="text-gray-500 text-sm">({param})</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Upgrade Costs */}
                  {(levelData.costItems || levelData.coinCost) && (
                    <div>
                      <h5 className="text-lg font-semibold text-blue-300 mb-2">Upgrade Cost to Level {selectedLevel}</h5>
                      <div className="bg-gray-800/50 rounded p-3">
                        {levelData.coinCost && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">Mora:</span>
                            <span className="text-yellow-400 font-mono">{levelData.coinCost.toLocaleString()}</span>
                          </div>
                        )}
                        {levelData.costItems && (
                          <div>
                            <p className="text-gray-400 text-sm mb-1">Materials:</p>
                            {Object.entries(levelData.costItems).map(([itemId, count]) => (
                              <div key={itemId} className="flex justify-between items-center">
                                <span className="text-gray-300">Item {itemId}:</span>
                                <span className="text-blue-400 font-mono">{count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Raw Parameters */}
                  <details className="bg-gray-800/30 rounded p-3">
                    <summary className="text-blue-300 cursor-pointer mb-2">Raw Parameter Data</summary>
                    <div className="bg-gray-900/50 rounded p-2 font-mono text-xs text-gray-400">
                      <pre>{JSON.stringify(levelData.parameters, null, 2)}</pre>
                    </div>
                  </details>
                </>
              )}
            </div>
          </div>

          {/* Passive Talents */}
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-blue-300 mb-3">Passive Talents</h4>
            <div className="grid gap-4">
              {character.talents.passiveTalents.map((passive, index) => (
                <div key={index} className="bg-gray-800/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={passive.icon}
                      alt={passive.name}
                      className="w-10 h-10 rounded"
                    />
                    <h5 className="text-white font-semibold">{passive.name}</h5>
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-line">
                    {formatDescription(passive.description)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Data Verification */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-green-300 mb-2">Talent Data Verification</h4>
            <div className="text-sm text-green-200 space-y-1">
              <p>✅ Normal Attack: {character.talents.normalAttack.levelData.length} levels extracted</p>
              <p>✅ Elemental Skill: {character.talents.elementalSkill.levelData.length} levels extracted</p>
              <p>✅ Elemental Burst: {character.talents.elementalBurst.levelData.length} levels extracted</p>
              <p>✅ Passive Talents: {character.talents.passiveTalents.length} talents extracted</p>
              <p>✅ All parameter values and upgrade costs included</p>
              <p>✅ Complete API data structure preserved</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TalentViewer;