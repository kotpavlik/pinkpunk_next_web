'use client'

import React, { useState } from 'react'
import Image from 'next/image'

interface CustomMapMarkerProps {
    title?: string
    subtitle?: string
    onClick?: () => void
}

export default function CustomMapMarker({

}: CustomMapMarkerProps) {
    const [isHovered, setIsHovered] = useState(false)



    return (
        <>
            {/* Кнопка "Построить маршрут" слева от маркера */}
            <a
                href="https://yandex.ru/maps/?rtext=~53.894522,27.541278&rtt=auto"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '50%',
                    transform: 'translateX(-50%)',
                    background: ` var(--mint-dark) `,
                    padding: '7px 8px',
                    minWidth: '150px',
                    borderRadius: '16px',
                    fontSize: '20px',
                    fontFamily: 'var(--font-durik)',
                    fontWeight: 'bold',
                    color: 'var(--pink-light)',
                    border: '1px solid var(--mint-dark)',
                    textAlign: 'center'
                }}
            >
                Построить маршрут
            </a>

            <div
                style={{
                    width: '60px',
                    height: '60px',
                    background: isHovered
                        ? 'linear-gradient(135deg, rgba(255, 43, 156, 0.3), rgba(255, 105, 180, 0.3))'
                        : 'linear-gradient(135deg, rgba(255, 43, 156, 0.2), rgba(255, 105, 180, 0.2))',
                    backdropFilter: 'blur(10px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.6)',
                    boxShadow: isHovered
                        ? '0 0 10px rgba(255, 43, 156, 0.8), 0 0 20px rgba(255, 43, 156, 0.4), 0 5px 10px rgba(255, 43, 156, 0.6)'
                        : '0 4px 12px rgba(255, 43, 156, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px',
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    zIndex: 1000,
                    transform: `translate(-25px, -40px)`,
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <Image
                    src="/pnk_for_yandex.svg"
                    width={35}
                    height={35}
                    alt="Pink Punk"
                    style={{
                        transition: 'filter 0.3s ease'
                    }}
                />

                {/* Tooltip */}
                {isHovered && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '70px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: '#ff2b9c',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            fontFamily: 'var(--font-durik)',
                            animation: 'fadeIn 0.3s ease'
                        }}
                    >
                        ПИНК ПАНК
                        <div
                            className="underline-animation"
                            style={{
                                position: 'absolute',
                                bottom: '1px',
                                left: '0',
                                width: '100%',
                                height: '4px',
                                background: '#ff2b9c',
                                animation: 'slideIn 1s ease-out forwards'
                            }}
                        />
                    </div>
                )}

                {/* Расписание работы */}

                <div
                    className="glass-effect"
                    style={{
                        position: 'absolute',
                        top: '70px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: ` var(--mint-dark) `,
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        color: 'white',
                        padding: '16px 20px',
                        borderRadius: '16px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        border: '1px solid var(--mint-dark)',
                        animation: 'slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        minWidth: '200px',
                        textAlign: 'center'
                    }}
                >
                    <div style={{
                        fontSize: '20px',
                        marginBottom: '8px',
                        fontWeight: 'extrabold',
                        fontFamily: 'var(--font-durik)',
                        color: 'var(--pink-light)',
                        position: 'relative',
                        display: 'inline-block',

                    }}>
                        РЕЖИМ РАБОТЫ
                        <div
                            className="underline-animation"
                            style={{
                                position: 'absolute',
                                bottom: '-1px',
                                left: '0',
                                width: '100%',
                                height: '4px',
                                background: 'var(--pink-light)',
                                animation: 'slideIn 1s ease-out forwards'
                            }}
                        />
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: 'rgb(39 28 46)', fontWeight: 'bold' }}>
                        каждый день: 12:00 - 20:00
                    </div>

                    <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'rgba(39 28 46 / 0.5)', fontWeight: 'bold' }}>
                        г.Минск ул.Мясникова 76, 1 подъезд,помещение 14,последний этаж
                    </div>
                </div>


                <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0; 
                        transform: translateX(-50%) translateY(20px) scale(0.9); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateX(-50%) translateY(0) scale(1); 
                    }
                }
                @keyframes slideIn {
                    from { 
                        transform: scaleX(0); 
                        transform-origin: left;
                    }
                    to { 
                        transform: scaleX(1); 
                        transform-origin: left;
                    }
                }
         `}</style>
            </div>
        </>
    )
}
