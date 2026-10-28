import { Check, RotateCcw } from 'lucide-react'
import { animals, type AnimalId } from '../data/mockLesson'

export function InteractiveMaterial({ selected, target, disabled, onSelect }: { selected: AnimalId | null; target: AnimalId; disabled: boolean; onSelect: (id: AnimalId) => void }) {
  return <div className="animal-grid" aria-label="动物图片识词">{animals.map(animal => {
    const chosen = selected === animal.id
    const correct = chosen && selected === target
    return <button key={animal.id} className={`animal-card animal-${animal.id} ${chosen ? correct ? 'correct' : 'incorrect' : ''}`} onClick={() => onSelect(animal.id)} disabled={disabled} aria-label={`选择 ${animal.id}`} aria-pressed={chosen}>
      <img src={animal.image} alt={animal.id} draggable={false}/>
      <span className="animal-word">{animal.id}</span>
      {chosen && <span className="choice-badge" aria-hidden="true">{correct ? <Check size={22}/> : <RotateCcw size={20}/>}</span>}
    </button>
  })}</div>
}
