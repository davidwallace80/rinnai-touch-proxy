export interface Command {
  path: string;
  values?: Record<string, any>;
  readWrite: boolean;
  description: string;
  serviceId?: string;
  supportedServices?: string[];
}

export const systemCommandSet = {
  multiSetPoint: {
    path: 'SYST.CFG.MTSP',
    //values: {true: 'Y', false: 'N'},
    values: {Y: true, N: false},
    readWrite: false,
    description: 'Multi set point control enabled',
  },
  duelFuelAllowed: {
    path: 'SYST.CFG.DF',
    //values: {true: 'Y', false: 'N'},
    values: {Y: true, N: false},
    readWrite: false,
    description: 'Dual fuel control allowed',
  },
  tempUnit: {
    path: 'SYST.CFG.TU',
    readWrite: false,
    description: 'Temperature display units',
  },
  clockFormat: {
    path: 'SYST.CFG.CF',
    values: {1: 12, 2: 24},
    readWrite: false,
    description: 'Temperature display units',
  },
  descriptionZoneA: {
    path: 'SYST.CFG.ZA',
    readWrite: false,
    description: 'Zone A description',
  },
  descriptionZoneB: {
    path: 'SYST.CFG.ZB',
    readWrite: false,
    description: 'Zone B description',
  },
  descriptionZoneC: {
    path: 'SYST.CFG.ZC',
    readWrite: false,
    description: 'Zone C description',
  },
  descriptionZoneD: {
    path: 'SYST.CFG.ZD',
    readWrite: false,
    description: 'Zone D description',
  },
  fwVersion: {
    path: 'SYST.CFG.VR',
    readWrite: false,
    description: 'N-BW2 firmware version',
  },
  fwWifiVersion: {
    path: 'SYST.CFG.CV',
    readWrite: false,
    description: 'N-BW2 WiFi module firmware version',
  },
  certChecksum: {
    path: 'SYST.CFG.CC',
    readWrite: false,
    description: 'Certificate checksum value',
  },
  nc7: {
    path: 'SYST.CFG.NC',
    values: {true: 'Y', false: 'N'},
    readWrite: false,
    description: 'N-C7 based system',
  },
  gasHeating: {
    path: 'SYST.AVM.HG',
    values: {Y: true, N: false},
    readWrite: false,
    description: 'Gas heating installed',
    serviceId: 'HGOM',
  },
  evapCooling: {
    path: 'SYST.AVM.EC',
    values: {Y: true, N: false},
    readWrite: false,
    description: 'Evaporative cooling installed',
    serviceId: 'ECOM',
  },
  addonCooling: {
    path: 'SYST.AVM.CG',
    values: {Y: true, N: false},
    readWrite: false,
    description: 'Add-on cooling installed',
    serviceId: 'CGOM',
  },
  reverseCycle: {
    path: 'SYST.AVM.RA',
    values: {Y: true, N: false},
    readWrite: false,
    description: 'Reverse-cycle air conditioning installed',
    serviceId: 'RCOM',
  },
  reverseCycleHeating: {
    path: 'SYST.AVM.RH',
    values: {Y: true, N: false},
    readWrite: false,
    description: 'Reverse-cycle heating installed',
  },
  reverseCycleCooling: {
    path: 'SYST.AVM.RC',
    values: {Y: true, N: false},
    readWrite: false,
    description: 'Reverse-cycle cooling installed',
  },
  networkerDay: {
    path: 'SYST.OSS.DY',
    readWrite: false,
    description: 'Network day of the week',
  },
  networkerTime: {
    path: 'SYST.OSS.TM',
    readWrite: false,
    description: 'Network time',
  },
  registeredMaster: {
    path: 'SYST.OSS.RG',
    values: {Y: true, N: false},
    readWrite: false,
    description: 'N-BW2 Module is registered with the master networker',
  },
  operatingState: {
    path: 'SYST.OSS.ST',
    values: {N: 'normal', C: 'clock', P: 'parameter', U: 'user', Y: 'pin'},
    readWrite: false,
    description: 'Operating state',
  },
  operatingMode: {
    path: 'SYST.OSS.MD',
    values: {H: 'heating', E: 'evapCooling', C: 'addonCooling', R: 'reverseCycle', N: 'none'},
    readWrite: true,
    description: 'Operating mode',
    supportedServices: ['gasHeating', 'evapCooling', 'addonCooling'],
  },
  faultDetected: {
    path: 'SYST.FLT.AV',
    values: {Y: true, N: false},
    readWrite: false,
    description: 'Fault has been detected',
  },
  faultLocation: {
    path: 'SYST.FLT.GP',
    values: {H: 'heating', E: 'evapCooling', C: 'addonCooling', R: 'reverseCycle', N: 'controller'},
    readWrite: false,
    description: 'Device type exhibiting fault',
  },
  faultDeviceId: {
    path: 'SYST.FLT.UT',
    readWrite: false,
    description: 'Device id exhibiting fault',
  },
  faultSeverity: {
    path: 'SYST.FLT.TP',
    values: {M: 'minor', B: 'busy', L: 'lockout'},
    readWrite: false,
    description: 'Fault severity',
  },
  faultCode: {
    path: 'SYST.FLT.CD',
    readWrite: false,
    description: 'Fault code',
  },
};

export const serviceCommandSet = serviceId => {
  return {
    commonZone: {
      path: `${serviceId}.CFG.ZUIS`,
      values: {Y: true, N: false},
      readWrite: false,
      description: 'Common zone enabled',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    zoneA: {
      path: `${serviceId}.CFG.ZAIS`,
      values: {Y: true, N: false},
      readWrite: false,
      description: 'Zone A enabled',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    zoneB: {
      path: `${serviceId}.CFG.ZBIS`,
      values: {Y: true, N: false},
      readWrite: false,
      description: 'Zone B enabled',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    zoneC: {
      path: `${serviceId}.CFG.ZCIS`,
      values: {Y: true, N: false},
      readWrite: false,
      description: 'Zone C enabled',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    zoneD: {
      path: `${serviceId}.CFG.ZDIS`,
      values: {Y: true, N: false},
      readWrite: false,
      description: 'Zone D enabled',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    circulationFan: {
      path: `${serviceId}.CFG.CF`,
      values: {Y: true, N: false},
      readWrite: false,
      description: 'Circulation fan enabled',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    operatingState: {
      path: `${serviceId}.OOP.ST`,
      values: {F: 'off', N: 'on', Z: 'fan'},
      readWrite: true,
      description: 'Operating state',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    fanSpeed: {
      path: `${serviceId}.OOP.FL`,
      readWrite: true,
      description: 'Fan speed (0-16)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    currentTemp: {
      path: `${serviceId}.ZUS.MT`,
      readWrite: false,
      description: 'Current temperature (999=unavailble)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    setTemp: {
      path: `${serviceId}.GSO.SP`,
      readWrite: true,
      description: 'Set temperature (0-30)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    currentTempZoneA: {
      path: `${serviceId}.ZAS.MT`,
      readWrite: false,
      description: 'Current temperature (999=unavailble)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    setTempZoneA: {
      path: `${serviceId}.ZAO.SP`,
      readWrite: true,
      description: 'Set temperature (0-30)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    currentTempZoneB: {
      path: `${serviceId}.ZBS.MT`,
      readWrite: false,
      description: 'Current temperature (999=unavailble)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    setTempZoneB: {
      path: `${serviceId}.ZBO.SP`,
      readWrite: true,
      description: 'Set temperature (0-30)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    currentTempZoneC: {
      path: `${serviceId}.ZCS.MT`,
      readWrite: false,
      description: 'Current temperature (999=unavailble)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    setTempZoneC: {
      path: `${serviceId}.ZCO.SP`,
      readWrite: true,
      description: 'Set temperature (0-30)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    currentTempZoneD: {
      path: `${serviceId}.ZDS.MT`,
      readWrite: false,
      description: 'Current temperature (999=unavailble)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    setTempZoneD: {
      path: `${serviceId}.ZDO.SP`,
      readWrite: true,
      description: 'Set temperature (0-30)',
      supportedServices: ['gasHeating', 'addonCooling', 'reverseCycle'],
    },
    reverseCycleMode: {
      path: `${serviceId}.GSO.AM`,
      values: {C: 'cooling', D: 'cooling_heating', H: 'heating'},
      readWrite: true,
      description: 'Set temperature (0-30)',
      supportedServices: ['reverseCycle'],
    },
  };
};
